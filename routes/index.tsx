import { page } from "fresh";
import { define } from "@/utils.ts";
import { db, type SearchJob } from "@/db/db.ts";
import { Layout } from "../components/Layout.tsx";
import { Head } from "fresh/runtime";
import { fmtTs } from "@/utils.ts";

export const handler = define.handlers({
  GET(ctx) {
    if (!ctx.state.userId) return ctx.next();
    const d = db();
    const count = (cond: string) =>
      Number(
        [...d.sql<{ c: number }>`SELECT COUNT(*) c FROM leads WHERE ${cond}`][0]
          ?.c ?? 0,
      );
    const jobs = [...d.sql<SearchJob & { username: string }>`
      SELECT j.*, u.username FROM search_jobs j JOIN users u ON u.id = j.created_by
      ORDER BY j.id DESC LIMIT 8`];
    return page({
      counts: {
        HOT: count(`priority='HOT'`),
        WARM: count(`priority='WARM'`),
        SKIP: count(`priority='SKIP'`),
        NEW: count(`status='NEW'`),
        CONTACTED: count(`status='CONTACTED'`),
        REPLIED: count(`status='REPLIED'`),
        BOOKED: count(`status='BOOKED'`),
        total: Number(
          [...d.sql<{ c: number }>`SELECT COUNT(*) c FROM leads`][0]?.c ?? 0,
        ),
      },
      jobs,
      error: ctx.url.searchParams.get("error"),
    });
  },
});

export default define.page<typeof handler>(function Home(ctx) {
  const data = ctx.data;
  const c = data.counts;

  return (
    <Layout active="/">
      <Head>
        <title>Dashboard — GMaps Intelligence</title>
      </Head>
      {data.error && (
        <p class="mb-4 text-sm text-[var(--color-hot)] bg-[var(--color-paper-2)] border border-[var(--color-hot)] p-2 rounded">
          {data.error}
        </p>
      )}
      <h1 class="text-2xl font-bold mb-4">New search</h1>
      <form
        method="post"
        action="/search"
        class="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-lg p-4 mb-8 flex flex-wrap gap-3 items-end"
      >
        <div class="flex-1 min-w-40">
          <label class="block text-sm text-[var(--color-ink-2)] mb-1">
            Keyword (niche)
          </label>
          <input
            name="keyword"
            required
            placeholder="e.g. dentist"
            class="w-full border border-[var(--color-rule-strong)] rounded-md px-3 py-2 bg-[var(--color-paper-2)]"
          />
        </div>
        <div class="flex-1 min-w-40">
          <label class="block text-sm text-[var(--color-ink-2)] mb-1">
            Location
          </label>
          <input
            name="location"
            required
            placeholder="e.g. Jakarta"
            class="w-full border border-[var(--color-rule-strong)] rounded-md px-3 py-2 bg-[var(--color-paper-2)]"
          />
        </div>
        <button
          type="submit"
          class="bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-[var(--color-accent-ink)] font-medium px-5 py-2 rounded-md"
        >
          Search Places
        </button>
      </form>

      <h2 class="text-xl font-bold mb-3">Pipeline</h2>
      <div class="border border-[var(--color-rule)] rounded-lg bg-[var(--color-paper-2)] mb-8 divide-y divide-[var(--color-rule)]">
        <div class="p-5 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <span class="text-5xl font-bold num text-[var(--color-hot)]">
            {c.HOT}
          </span>
          <span class="text-sm text-[var(--color-ink-2)]">
            HOT leads ready to work
          </span>
          <span class="num ml-auto text-sm text-[var(--color-ink-3)]">
            of {c.total} total
          </span>
        </div>
        <dl class="grid grid-cols-3 md:grid-cols-6 divide-x divide-[var(--color-rule)]">
          {[
            ["WARM", c.WARM, "text-[var(--color-warm)]"],
            ["SKIP", c.SKIP, "text-[var(--color-ink-3)]"],
            ["NEW", c.NEW, ""],
            ["CONTACTED", c.CONTACTED, ""],
            ["REPLIED", c.REPLIED, "text-[var(--color-ok)]"],
            ["BOOKED", c.BOOKED, "text-[var(--color-ok)]"],
          ].map(([label, value, color]) => (
            <div class="p-4">
              <dd class={`text-2xl font-bold num ${color}`}>{value}</dd>
              <dt class="text-xs text-[var(--color-ink-3)] tracking-wide">
                {label}
              </dt>
            </div>
          ))}
        </dl>
      </div>

      <h2 class="text-xl font-bold mb-3">Recent searches</h2>
      <div class="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-lg overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-[var(--color-ink-3)] border-b border-[var(--color-rule)]">
            <tr>
              <th class="p-3 font-medium">Keyword</th>
              <th class="p-3 font-medium">Location</th>
              <th class="p-3 font-medium">Results</th>
              <th class="p-3 font-medium">New</th>
              <th class="p-3 font-medium">By</th>
              <th class="p-3 font-medium">When</th>
              <th class="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.jobs.map((j) => (
              <tr class="border-t border-[var(--color-rule)]">
                <td class="p-3 font-medium">{j.keyword}</td>
                <td class="p-3">{j.location}</td>
                <td class="p-3 num">{j.result_count}</td>
                <td class="p-3 num text-[var(--color-ok)]">{j.new_count}</td>
                <td class="p-3">{j.username}</td>
                <td class="p-3 text-[var(--color-ink-3)]">
                  {fmtTs(j.created_at)}
                </td>
                <td class="p-3">
                  <a
                    class="text-[var(--color-accent)] hover:underline"
                    href={`/leads?job=${j.id}`}
                  >
                    View leads
                  </a>
                </td>
              </tr>
            ))}
            {data.jobs.length === 0 && (
              <tr>
                <td class="p-4 text-[var(--color-ink-3)]" colSpan={7}>
                  No searches yet. Run one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
});
