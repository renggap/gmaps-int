import { page } from "fresh";
import { define, fmtTs } from "@/utils.ts";
import { db, type Lead } from "@/db/db.ts";
import { aiResearch } from "@/lib/ai.ts";
import { findPublicEmail } from "@/lib/scrape.ts";
import { Layout } from "../../components/Layout.tsx";
import { Head } from "fresh/runtime";

function getLead(id: string): Lead | null {
  const [lead] = [
    ...db().sql<Lead>`SELECT * FROM leads WHERE place_id = ${
      decodeURIComponent(id)
    }`,
  ];
  return lead ?? null;
}

export const handler = define.handlers({
  GET(ctx) {
    const lead = getLead(ctx.params.id);
    if (!lead) return new Response("Not found", { status: 404 });
    return page({ lead, aiError: ctx.url.searchParams.get("ai_error") });
  },

  async POST(ctx) {
    const lead = getLead(ctx.params.id);
    if (!lead) return new Response("Not found", { status: 404 });
    const form = await ctx.req.formData();
    const action = String(form.get("action") ?? "");

    if (action === "ai") {
      const key = Deno.env.get("CLAWGATOR_API_KEY") ?? "";
      if (!key) {
        return redirect(ctx.params.id, "CLAWGATOR_API_KEY not configured");
      }
      try {
        const s = await aiResearch(lead, key);
        // ponytail: only homepage scraped; add contact-page crawl if hit rate too low
        const email = lead.public_email
          ? null
          : lead.website
          ? await findPublicEmail(lead.website)
          : null;
        db().sql`UPDATE leads SET
          ai_summary = ${s.summary}, ai_score = ${s.score},
          ai_priority = ${s.priority}, ai_reason = ${s.reason},
          public_email = COALESCE(${email ?? null}, public_email),
          ai_at = datetime('now')
        WHERE place_id = ${lead.place_id}`;
      } catch (e) {
        return redirect(
          ctx.params.id,
          e instanceof Error ? e.message : "AI request failed",
        );
      }
      return redirect(ctx.params.id);
    }

    if (action === "accept_ai") {
      db().sql`UPDATE leads SET
        fit_score = ${lead.ai_score}, priority = ${lead.ai_priority}
      WHERE place_id = ${lead.place_id}`;
      return redirect(ctx.params.id);
    }

    // manual edit
    const status = String(form.get("status") ?? lead.status);
    const priority = String(form.get("priority") ?? lead.priority);
    if (
      !["NEW", "CONTACTED", "REPLIED", "BOOKED"].includes(status) ||
      !["HOT", "WARM", "SKIP"].includes(priority)
    ) {
      return redirect(ctx.params.id, "invalid value");
    }
    const next_action = str(form, "next_action");
    const notes = str(form, "notes");
    const last_contacted = str(form, "last_contacted");
    db().sql`UPDATE leads SET
      status = ${status}, priority = ${priority},
      next_action = ${next_action}, notes = ${notes},
      last_contacted = ${last_contacted}
    WHERE place_id = ${lead.place_id}`;
    return redirect(ctx.params.id);
  },
});

function redirect(id: string, aiError?: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: aiError
        ? `/leads/${encodeURIComponent(id)}?ai_error=${
          encodeURIComponent(aiError)
        }`
        : `/leads/${encodeURIComponent(id)}`,
    },
  });
}

function str(form: FormData, name: string): string | null {
  const v = form.get(name);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export default define.page<typeof handler>(function LeadDetail(ctx) {
  const { lead, aiError } = ctx.data;
  const field = (label: string, value: string | number | null) => (
    <div>
      <dt class="text-sm text-[var(--color-ink-3)]">{label}</dt>
      <dd class="font-medium">{value ?? "—"}</dd>
    </div>
  );
  const input =
    "border border-[var(--color-rule-strong)] bg-[var(--color-paper-2)] rounded-md px-3 py-2 w-full";

  return (
    <Layout active="/leads">
      <Head>
        <title>{lead.name} — GMaps Intelligence</title>
      </Head>
      <a
        class="text-[var(--color-accent)] hover:underline text-sm"
        href="/leads"
      >
        ← back to leads
      </a>
      <h1 class="text-2xl font-bold mt-2 mb-1">{lead.name}</h1>
      <p class="text-[var(--color-ink-3)] mb-6">
        {lead.address ?? "no address"}
      </p>

      {aiError && (
        <p class="mb-4 text-sm text-[var(--color-hot)] bg-[var(--color-paper-2)] border border-[var(--color-hot)] p-2 rounded">
          {aiError}
        </p>
      )}

      <div class="grid md:grid-cols-2 gap-6">
        <div class="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-lg p-5">
          <h2 class="font-bold mb-3">Public info</h2>
          <dl class="grid grid-cols-2 gap-4">
            {field("Category", lead.category)}
            {field("Rating", lead.rating != null ? `★ ${lead.rating}` : null)}
            {field("Reviews", lead.review_count)}
            {field("Phone", lead.phone)}
            {field("Public email", lead.public_email)}
            {field("First seen", fmtTs(lead.first_seen))}
            {field("Last seen", fmtTs(lead.last_seen))}
          </dl>
          <div className="mt-3">
            <dt class="text-sm text-[var(--color-ink-3)]">Website</dt>
            <dd>
              {lead.website
                ? (
                  <a
                    class="text-[var(--color-accent)] hover:underline"
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {lead.website}
                  </a>
                )
                : "—"}
            </dd>
          </div>
          <div className="mt-3">
            <dt class="text-sm text-[var(--color-ink-3)]">Maps</dt>
            <dd>
              <a
                class="text-[var(--color-accent)] hover:underline"
                href={`https://www.google.com/maps/place/?q=place_id:${lead.place_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                view on Google Maps
              </a>
            </dd>
          </div>
        </div>

        <form
          method="post"
          class="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-lg p-5 space-y-3"
        >
          <input type="hidden" name="action" value="edit" />
          <h2 class="font-bold">Tracker</h2>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-[var(--color-ink-3)] mb-1">
                Priority
              </label>
              <select name="priority" class={input}>
                {["HOT", "WARM", "SKIP"].map((p) => (
                  <option value={p} selected={lead.priority === p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label class="block text-sm text-[var(--color-ink-3)] mb-1">
                Status
              </label>
              <select name="status" class={input}>
                {["NEW", "CONTACTED", "REPLIED", "BOOKED"].map((s) => (
                  <option value={s} selected={lead.status === s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm text-[var(--color-ink-3)] mb-1">
              Last contacted (date)
            </label>
            <input
              type="date"
              name="last_contacted"
              class={input}
              value={lead.last_contacted ?? ""}
            />
          </div>
          <div>
            <label class="block text-sm text-[var(--color-ink-3)] mb-1">
              Next action
            </label>
            <input
              type="text"
              name="next_action"
              class={input}
              value={lead.next_action ?? ""}
            />
          </div>
          <div>
            <label class="block text-sm text-[var(--color-ink-3)] mb-1">
              Notes
            </label>
            <textarea name="notes" rows={3} class={input}>
              {lead.notes ?? ""}
            </textarea>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--color-ink-3)]">
              Fit score: <strong class="num">{lead.fit_score ?? "—"}</strong>
            </span>
            <button
              class="bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-[var(--color-accent-ink)] font-medium px-4 py-2 rounded-md"
              type="submit"
            >
              Save
            </button>
          </div>
        </form>
      </div>

      <div class="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-lg p-5 mt-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-bold">AI research</h2>
          <form method="post">
            <input type="hidden" name="action" value="ai" />
            <button
              class="bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-[var(--color-accent-ink)] text-sm font-medium px-3 py-1.5 rounded-md"
              type="submit"
            >
              {lead.ai_at ? "Re-run" : "Research with AI…"}
            </button>
          </form>
        </div>
        {lead.ai_at
          ? (
            <div class="space-y-2">
              <p class="text-sm text-[var(--color-ink-3)]">
                ran {fmtTs(lead.ai_at)}{" "}
                — suggestion only, nothing applied automatically
              </p>
              <p>
                <strong>AI summary:</strong> {lead.ai_summary}
              </p>
              <p class="num">
                <strong>AI score:</strong> {lead.ai_score} ·{" "}
                <strong>AI priority:</strong> {lead.ai_priority}
              </p>
              <p>
                <strong>Reason:</strong> {lead.ai_reason}
              </p>
              {(lead.ai_score !== lead.fit_score ||
                lead.ai_priority !== lead.priority) && (
                <form method="post" class="pt-2">
                  <input type="hidden" name="action" value="accept_ai" />
                  <button
                    class="border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] text-sm font-medium px-3 py-1.5 rounded-md"
                    type="submit"
                  >
                    Accept AI score {lead.ai_score} / {lead.ai_priority}
                  </button>
                </form>
              )}
            </div>
          )
          : (
            <p class="text-[var(--color-ink-3)] text-sm">
              No AI research yet. Runs on public info only; you approve any
              change.
            </p>
          )}
      </div>
    </Layout>
  );
});
