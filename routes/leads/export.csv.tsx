import { define } from "@/utils.ts";
import { db } from "@/db/db.ts";
import { buildLeadQuery } from "@/lib/query.ts";
import type { Lead } from "@/db/db.ts";

const COLUMNS: (keyof Lead)[] = [
  "name",
  "category",
  "address",
  "rating",
  "review_count",
  "website",
  "phone",
  "public_email",
  "fit_score",
  "priority",
  "status",
  "last_contacted",
  "next_action",
  "notes",
  "ai_summary",
  "ai_score",
  "ai_priority",
  "ai_reason",
  "first_seen",
  "last_seen",
];

export function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const handler = define.handlers({
  GET(ctx) {
    const f = Object.fromEntries(ctx.url.searchParams.entries());
    const { where, params, order } = buildLeadQuery(f);
    // ponytail: no pagination on export, capped at 10k rows
    const stmt = db().prepare(
      `SELECT * FROM leads ${where} ${order} LIMIT 10000`,
    );
    const rows = stmt.all(...params as never[]) as unknown as Lead[];

    const lines = [COLUMNS.join(",")];
    for (const r of rows) {
      lines.push(COLUMNS.map((c) => csvEscape(r[c])).join(","));
    }
    return new Response("\uFEFF" + lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${
          new Date().toISOString().slice(0, 10)
        }.csv"`,
      },
    });
  },
});
