import { Database } from "@db/sqlite";
import { join } from "@std/path";
import { SCHEMA } from "./schema_text.ts";

export function openDb(path: string): Database {
  const db = new Database(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);
  return db;
}

let _db: Database | null = null;
export function db(): Database {
  if (!_db) {
    const dataDir = Deno.env.get("DATA_DIR") ?? join(Deno.cwd(), "data");
    Deno.mkdirSync(dataDir, { recursive: true });
    _db = openDb(join(dataDir, "gmaps.db"));
  }
  return _db;
}

export type Lead = {
  place_id: string;
  name: string;
  category: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  review_count: number | null;
  website: string | null;
  phone: string | null;
  public_email: string | null;
  source_job_id: number | null;
  first_seen: string;
  last_seen: string;
  fit_score: number | null;
  priority: "HOT" | "WARM" | "SKIP";
  status: "NEW" | "CONTACTED" | "REPLIED" | "BOOKED";
  last_contacted: string | null;
  next_action: string | null;
  notes: string | null;
  ai_summary: string | null;
  ai_score: number | null;
  ai_priority: "HOT" | "WARM" | "SKIP" | null;
  ai_reason: string | null;
  ai_at: string | null;
};

export type SearchJob = {
  id: number;
  keyword: string;
  location: string;
  created_by: number;
  created_at: string;
  result_count: number;
  new_count: number;
};

export type User = {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
};
