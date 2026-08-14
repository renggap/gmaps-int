import { assertEquals } from "@std/assert";
import { type Lead, openDb } from "../db/db.ts";
import { runSearch } from "./leads.ts";
import type { LeadData } from "./places.ts";

function mk(id: string, name: string, overrides = {}): LeadData {
  return {
    place_id: id,
    name,
    category: "Cafe",
    address: "Somewhere 1",
    lat: 1.5,
    lng: 2.5,
    rating: 4.6,
    review_count: 300,
    website: "https://x.example",
    phone: "123",
    ...overrides,
  };
}

function setup() {
  const path = Deno.makeTempFileSync({ suffix: ".db" });
  const db = openDb(path);
  db.sql`INSERT INTO users (username, password_hash) VALUES ('u','h')`;
  return {
    db,
    cleanup: () => {
      db.close();
      Deno.removeSync(path);
    },
  };
}

Deno.test("runSearch inserts new leads + job", () => {
  const { db, cleanup } = setup();
  const { job, newCount } = runSearch(db, "cafe", "Berlin", 1, [
    mk("p1", "A"),
    mk("p2", "B"),
  ]);
  assertEquals(job.keyword, "cafe");
  assertEquals(job.result_count, 2);
  assertEquals(job.new_count, 2);
  assertEquals(newCount, 2);
  const leads = [...db.sql<Lead>`SELECT * FROM leads`];
  assertEquals(leads.length, 2);
  assertEquals(leads[0].fit_score, 9);
  assertEquals(leads[0].priority, "HOT");
  cleanup();
});

Deno.test("runSearch re-run dedupes and keeps manual fields", () => {
  const { db, cleanup } = setup();
  runSearch(db, "cafe", "Berlin", 1, [mk("p1", "A")]);
  db.sql`UPDATE leads SET status = 'CONTACTED', notes = 'called them', fit_score = 3, priority = 'SKIP' WHERE place_id = 'p1'`;

  const { newCount } = runSearch(db, "cafe", "Berlin", 1, [
    mk("p1", "A v2", { rating: 4.0, review_count: 50 }),
    mk("p3", "C"),
  ]);
  assertEquals(newCount, 1);

  const [lead] = [...db.sql<Lead>`SELECT * FROM leads WHERE place_id = 'p1'`];
  assertEquals(lead.name, "A v2"); // refreshed
  assertEquals(lead.rating, 4.0); // refreshed
  assertEquals(lead.status, "CONTACTED"); // kept
  assertEquals(lead.notes, "called them"); // kept
  assertEquals(lead.fit_score, 3); // kept
  assertEquals(lead.priority, "SKIP"); // kept
  cleanup();
});
