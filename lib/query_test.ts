import { assert, assertEquals } from "@std/assert";
import { openDb } from "../db/db.ts";
import { buildLeadQuery, queryLeads } from "./query.ts";
import { runSearch } from "./leads.ts";
import type { LeadData } from "./places.ts";

function mk(id: string, name: string, o: Partial<LeadData> = {}): LeadData {
  return {
    place_id: id,
    name,
    category: "Cafe",
    address: "Addr",
    lat: 1,
    lng: 1,
    rating: 4.5,
    review_count: 100,
    website: "https://w",
    phone: "1",
    ...o,
  };
}

function setup() {
  const path = Deno.makeTempFileSync({ suffix: ".db" });
  const db = openDb(path);
  db.sql`INSERT INTO users (username, password_hash) VALUES ('u','h')`;
  runSearch(db, "cafe", "Berlin", 1, [
    mk("a", "Alpha", { rating: 4.9, review_count: 600 }),
    mk("b", "Bravo", { rating: 3.0, review_count: 5, website: null }),
    mk("c", "Charlie", { rating: 4.2, review_count: 150 }),
  ]);
  return {
    db,
    cleanup: () => {
      db.close();
      Deno.removeSync(path);
    },
  };
}

Deno.test("queryLeads: no filter returns all sorted by score desc", () => {
  const { db, cleanup } = setup();
  const { rows, total } = queryLeads(db, {});
  assertEquals(total, 3);
  assertEquals(rows[0].name, "Alpha");
  cleanup();
});

Deno.test("queryLeads: priority filter", () => {
  const { db, cleanup } = setup();
  const { rows, total } = queryLeads(db, { priority: "HOT" });
  assert(total >= 1);
  assert(rows.every((l) => l.priority === "HOT"));
  cleanup();
});

Deno.test("queryLeads: q search matches name", () => {
  const { db, cleanup } = setup();
  const { rows, total } = queryLeads(db, { q: "bravo" });
  assertEquals(total, 1);
  assertEquals(rows[0].name, "Bravo");
  cleanup();
});

Deno.test("queryLeads: rating range + no website", () => {
  const { db, cleanup } = setup();
  const { total } = queryLeads(db, { min_rating: "4.0", has_website: "0" });
  assertEquals(total, 0); // only Bravo lacks website but rating 3.0
  const r2 = queryLeads(db, { has_website: "0" });
  assertEquals(r2.total, 1);
  cleanup();
});

Deno.test("queryLeads: rejects bad sort injection", () => {
  const q = buildLeadQuery({ sort: "name; DROP TABLE leads" });
  assert(!q.order.includes("DROP"));
});

Deno.test("queryLeads: pagination", () => {
  const { db, cleanup } = setup();
  const p1 = queryLeads(db, { page: "1" });
  const p2 = queryLeads(db, { page: "2" });
  assertEquals(p1.rows.length, 3);
  assertEquals(p2.rows.length, 0);
  cleanup();
});
