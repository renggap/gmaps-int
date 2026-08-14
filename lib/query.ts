import type { Database } from "@db/sqlite";
import type { Lead } from "../db/db.ts";

export type LeadFilters = {
  q?: string;
  priority?: string;
  status?: string;
  job?: string;
  min_rating?: string;
  max_rating?: string;
  min_reviews?: string;
  max_reviews?: string;
  has_website?: string;
  page?: string;
  sort?: string;
  dir?: string;
};

const SORTABLE = new Set([
  "name",
  "rating",
  "review_count",
  "fit_score",
  "priority",
  "status",
  "last_seen",
  "first_seen",
]);

export function buildLeadQuery(f: LeadFilters): {
  where: string;
  params: unknown[];
  order: string;
  perPage: number;
  page: number;
} {
  const conds: string[] = [];
  const params: unknown[] = [];

  const add = (cond: (p: string) => string, value: unknown) => {
    params.push(value);
    conds.push(cond(`?${params.length}`));
  };

  if (f.q) {
    params.push(`%${f.q}%`);
    const p = `?${params.length}`;
    conds.push(`(name LIKE ${p} OR category LIKE ${p} OR address LIKE ${p})`);
  }
  if (f.priority && ["HOT", "WARM", "SKIP"].includes(f.priority)) {
    add((p) => `priority = ${p}`, f.priority);
  }
  if (
    f.status && ["NEW", "CONTACTED", "REPLIED", "BOOKED"].includes(f.status)
  ) {
    add((p) => `status = ${p}`, f.status);
  }
  if (f.job && /^\d+$/.test(f.job)) {
    add((p) => `source_job_id = ${p}`, Number(f.job));
  }
  if (f.min_rating && !isNaN(Number(f.min_rating))) {
    add((p) => `rating >= ${p}`, Number(f.min_rating));
  }
  if (f.max_rating && !isNaN(Number(f.max_rating))) {
    add((p) => `rating <= ${p}`, Number(f.max_rating));
  }
  if (f.min_reviews && !isNaN(Number(f.min_reviews))) {
    add((p) => `review_count >= ${p}`, Number(f.min_reviews));
  }
  if (f.max_reviews && !isNaN(Number(f.max_reviews))) {
    add((p) => `review_count <= ${p}`, Number(f.max_reviews));
  }
  if (f.has_website === "1") {
    conds.push(`website IS NOT NULL AND website != ''`);
  }
  if (f.has_website === "0") conds.push(`website IS NULL OR website = ''`);

  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const sort = SORTABLE.has(f.sort ?? "") ? f.sort! : "fit_score";
  const dir = f.dir === "asc"
    ? "ASC"
    : (f.dir === "desc" ? "DESC" : (sort === "name" ? "ASC" : "DESC"));
  const order = `ORDER BY ${sort} ${dir}, name ASC`;
  const page = Math.max(1, Number(f.page) || 1);
  return { where, params, order, perPage: 50, page };
}

export function queryLeads(
  db: Database,
  f: LeadFilters,
): { rows: Lead[]; total: number } {
  const { where, params, order, perPage, page } = buildLeadQuery(f);
  const offset = (page - 1) * perPage;

  const stmt = db.prepare(
    `SELECT * FROM leads ${where} ${order} LIMIT ${perPage} OFFSET ${offset}`,
  );
  const rows = stmt.all(...params as never[]) as unknown as Lead[];

  const cstmt = db.prepare(`SELECT COUNT(*) c FROM leads ${where}`);
  const total = Number(
    (cstmt.all(...params as never[]) as unknown as { c: number }[])[0]?.c ?? 0,
  );
  return { rows, total };
}
