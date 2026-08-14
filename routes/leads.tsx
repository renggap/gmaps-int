import { page } from "fresh";
import { define, fmtTs } from "@/utils.ts";
import { db } from "@/db/db.ts";
import { type LeadFilters, queryLeads } from "@/lib/query.ts";
import { Layout } from "../components/Layout.tsx";
import { Head } from "fresh/runtime";

export const handler = define.handlers({
  GET(ctx) {
    const sp = ctx.url.searchParams;
    const f: LeadFilters = Object.fromEntries(sp.entries());
    const error = sp.get("error");
    const { rows, total } = queryLeads(db(), f);
    const pageNum = Math.max(1, Number(f.page) || 1);
    const perPage = 50;
    const pages = Math.ceil(total / perPage);
    return page({ rows, total, page: pageNum, pages, filters: f, error });
  },
});

const priorityBadge = (p: string) => (
  <span
    class={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
      p === "HOT"
        ? "border-[var(--color-hot)] text-[var(--color-hot)]"
        : p === "WARM"
        ? "border-[var(--color-warm)] text-[var(--color-warm)]"
        : "border-[var(--color-rule-strong)] text-[var(--color-ink-3)]"
    }`}
  >
    {p}
  </span>
);

export default define.page<typeof handler>(function Leads(ctx) {
  const { rows, total, page, pages, filters, error } = ctx.data;

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, ...over })) {
      if (v) p.set(k, v);
    }
    return `?${p.toString()}`;
  };

  const sortLink = (col: string, label: string) => {
    const active = filters.sort === col;
    const dir = active && filters.dir !== "asc" ? "asc" : "desc";
    return (
      <a
        class={active
          ? "text-[var(--color-accent)] underline"
          : "hover:underline"}
        href={qs({ sort: col, dir, page: undefined })}
      >
        {label}
        {active ? (filters.dir === "asc" ? " ↑" : " ↓") : ""}
      </a>
    );
  };

  const input =
    "border border-[var(--color-rule-strong)] bg-[var(--color-paper-2)] rounded px-2 py-1 text-sm";

  return (
    <Layout active="/leads">
      <Head>
        <title>Leads — GMaps Intelligence</title>
      </Head>
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">
          Leads{" "}
          <span class="num text-[var(--color-ink-3)] text-base font-normal">
            ({total})
          </span>
        </h1>
        <a
          href={`/leads/export.csv${ctx.url.search}`}
          class="border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] text-sm font-medium px-3 py-1.5 rounded-md"
        >
          Export CSV
        </a>
      </div>

      {error && (
        <p class="mb-4 text-sm text-[var(--color-hot)] bg-[var(--color-paper-2)] border border-[var(--color-hot)] p-2 rounded">
          {error}
        </p>
      )}

      <form
        method="get"
        action="/leads"
        class="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-lg p-4 mb-4 flex flex-wrap gap-2 items-end text-sm"
      >
        <input
          class={input}
          type="text"
          name="q"
          placeholder="Search name/category/address"
          value={filters.q ?? ""}
        />
        <select class={input} name="priority">
          <option value="">Priority: all</option>
          {["HOT", "WARM", "SKIP"].map((p) => (
            <option value={p} selected={filters.priority === p}>{p}</option>
          ))}
        </select>
        <select class={input} name="status">
          <option value="">Status: all</option>
          {["NEW", "CONTACTED", "REPLIED", "BOOKED"].map((s) => (
            <option value={s} selected={filters.status === s}>{s}</option>
          ))}
        </select>
        <select class={input} name="has_website">
          <option value="">Website: any</option>
          <option value="1" selected={filters.has_website === "1"}>
            has website
          </option>
          <option value="0" selected={filters.has_website === "0"}>
            no website
          </option>
        </select>
        <input
          class={`${input} w-20`}
          type="number"
          step="0.1"
          name="min_rating"
          placeholder="min ★"
          value={filters.min_rating ?? ""}
        />
        <input
          class={`${input} w-20`}
          type="number"
          name="min_reviews"
          placeholder="min rev"
          value={filters.min_reviews ?? ""}
        />
        {filters.job && <input type="hidden" name="job" value={filters.job} />}
        <button
          class="bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-[var(--color-accent-ink)] px-3 py-1.5 rounded"
          type="submit"
        >
          Filter
        </button>
        <a class="text-[var(--color-ink-3)] hover:underline px-2" href="/leads">
          clear
        </a>
      </form>

      <div class="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-lg overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-[var(--color-ink-3)] border-b border-[var(--color-rule)]">
            <tr>
              <th class="p-3 font-medium">{sortLink("name", "Business")}</th>
              <th class="p-3 font-medium">Category</th>
              <th class="p-3 font-medium">{sortLink("rating", "Rating")}</th>
              <th class="p-3 font-medium">
                {sortLink("review_count", "Reviews")}
              </th>
              <th class="p-3 font-medium">Website</th>
              <th class="p-3 font-medium">{sortLink("fit_score", "Score")}</th>
              <th class="p-3 font-medium">
                {sortLink("priority", "Priority")}
              </th>
              <th class="p-3 font-medium">{sortLink("status", "Status")}</th>
              <th class="p-3 font-medium">
                {sortLink("last_seen", "Last seen")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr class="border-t border-[var(--color-rule)] hover:bg-[var(--color-paper)]">
                <td class="p-3">
                  <a
                    class="text-[var(--color-accent)] hover:underline font-medium"
                    href={`/leads/${encodeURIComponent(l.place_id)}`}
                  >
                    {l.name}
                  </a>
                </td>
                <td class="p-3 text-[var(--color-ink-2)]">
                  {l.category ?? "—"}
                </td>
                <td class="p-3 num">
                  {l.rating != null ? `★ ${l.rating}` : "—"}
                </td>
                <td class="p-3 num">{l.review_count ?? "—"}</td>
                <td class="p-3">
                  {l.website
                    ? (
                      <a
                        class="text-[var(--color-accent)] hover:underline"
                        href={l.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        link
                      </a>
                    )
                    : "—"}
                </td>
                <td class="p-3 num font-semibold">{l.fit_score ?? "—"}</td>
                <td class="p-3">{priorityBadge(l.priority)}</td>
                <td class="p-3 text-[var(--color-ink-2)]">{l.status}</td>
                <td class="p-3 num text-[var(--color-ink-3)]">
                  {fmtTs(l.last_seen)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  class="p-6 text-[var(--color-ink-3)] text-center"
                  colSpan={9}
                >
                  No leads match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div class="flex gap-2 mt-4 items-center text-sm">
          {page > 1 && (
            <a
              class="px-3 py-1 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded hover:bg-[var(--color-paper)]"
              href={qs({ page: String(page - 1) })}
            >
              ← Prev
            </a>
          )}
          <span class="num text-[var(--color-ink-3)]">
            page {page} / {pages}
          </span>
          {page < pages && (
            <a
              class="px-3 py-1 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded hover:bg-[var(--color-paper)]"
              href={qs({ page: String(page + 1) })}
            >
              Next →
            </a>
          )}
        </div>
      )}
    </Layout>
  );
});
