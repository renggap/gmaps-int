import { assert, assertEquals, assertThrows } from "@std/assert";
import { type Lead, openDb } from "../db/db.ts";

function tmpDb() {
  const path = Deno.makeTempFileSync({ suffix: ".db" });
  const db = openDb(path);
  return {
    db,
    cleanup: () => {
      db.close();
      Deno.removeSync(path);
    },
  };
}

Deno.test("openDb is idempotent", () => {
  const { db, cleanup } = tmpDb();
  const again = openDb(db.path);
  again.close();
  cleanup();
});

Deno.test("lead insert + unique place_id", () => {
  const { db, cleanup } = tmpDb();
  db.sql`INSERT INTO leads (place_id, name) VALUES ('p1', 'Cafe A')`;
  const rows = [...db.sql<Lead>`SELECT * FROM leads`];
  assertEquals(rows.length, 1);
  assertEquals(rows[0].priority, "WARM");
  assertEquals(rows[0].status, "NEW");
  assertThrows(() =>
    db.sql`INSERT INTO leads (place_id, name) VALUES ('p1', 'Cafe B')`
  );
  // check constraint
  let threw = false;
  try {
    db.sql`INSERT INTO leads (place_id, name, priority) VALUES ('p2', 'X', 'NOPE')`;
  } catch {
    threw = true;
  }
  assert(threw);
  cleanup();
});

Deno.test("search_jobs fk to users", () => {
  const { db, cleanup } = tmpDb();
  db.sql`INSERT INTO users (username, password_hash) VALUES ('u', 'h')`;
  db.sql`INSERT INTO search_jobs (keyword, location, created_by) VALUES ('kw', 'loc', 1)`;
  const jobs = [...db.sql`SELECT * FROM search_jobs`];
  assertEquals(jobs.length, 1);
  let threw = false;
  try {
    db.sql`INSERT INTO search_jobs (keyword, location, created_by) VALUES ('k','l',99)`;
  } catch {
    threw = true;
  }
  assert(threw);
  cleanup();
});
