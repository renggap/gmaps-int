import type { Database } from "@db/sqlite";
import type { LeadData } from "./places.ts";
import { scoreLead } from "./score.ts";
import type { SearchJob } from "../db/db.ts";

export type SearchResult = { job: SearchJob; newCount: number };

// upsert leads by place_id; refresh public fields + last_seen,
// keep manual fields (fit_score, priority, status, notes, ...)
export function runSearch(
  db: Database,
  keyword: string,
  location: string,
  userId: number,
  datas: LeadData[],
): SearchResult {
  db.sql`INSERT INTO search_jobs (keyword, location, created_by) VALUES (${keyword}, ${location}, ${userId})`;
  const jobId = Number(db.lastInsertRowId);

  let newCount = 0;
  for (const d of datas) {
    const existing = [
      ...db.sql<
        { place_id: string }
      >`SELECT place_id FROM leads WHERE place_id = ${d.place_id}`,
    ];
    const { fit_score, priority } = scoreLead(d);

    if (existing.length === 0) {
      db.sql`INSERT INTO leads (
        place_id, name, category, address, lat, lng, rating, review_count,
        website, phone, source_job_id, fit_score, priority
      ) VALUES (
        ${d.place_id}, ${d.name}, ${d.category}, ${d.address}, ${d.lat}, ${d.lng},
        ${d.rating}, ${d.review_count}, ${d.website}, ${d.phone}, ${jobId},
        ${fit_score}, ${priority}
      )`;
      newCount++;
    } else {
      db.sql`UPDATE leads SET
        name = ${d.name}, category = ${d.category}, address = ${d.address},
        lat = ${d.lat}, lng = ${d.lng}, rating = ${d.rating},
        review_count = ${d.review_count}, website = ${d.website},
        phone = ${d.phone}, last_seen = datetime('now')
      WHERE place_id = ${d.place_id}`;
    }
  }

  db.sql`UPDATE search_jobs SET result_count = ${datas.length}, new_count = ${newCount} WHERE id = ${jobId}`;
  const [job] = [
    ...db.sql<SearchJob>`SELECT * FROM search_jobs WHERE id = ${jobId}`,
  ];
  return { job, newCount };
}
