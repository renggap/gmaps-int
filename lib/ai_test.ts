import { assert, assertThrows } from "@std/assert";
import { aiResearch, buildPrompt, parseAiResponse } from "./ai.ts";
import type { Lead } from "../db/db.ts";

const lead: Lead = {
  place_id: "p1",
  name: "Cafe Alpha",
  category: "Coffee shop",
  address: "Main St",
  lat: 1,
  lng: 2,
  rating: 4.6,
  review_count: 300,
  website: "https://x.example",
  phone: "123",
  public_email: null,
  source_job_id: 1,
  first_seen: "2026-01-01",
  last_seen: "2026-01-01",
  fit_score: 9,
  priority: "HOT",
  status: "NEW",
  last_contacted: null,
  next_action: null,
  notes: "private note",
  ai_summary: null,
  ai_score: null,
  ai_priority: null,
  ai_reason: null,
  ai_at: null,
};

Deno.test("prompt contains public fields, not private", () => {
  const p = buildPrompt(lead);
  assert(p.includes("Cafe Alpha"));
  assert(p.includes("4.6"));
  assert(p.includes("Never invent"));
  assert(!p.includes("private note")); // notes never sent
  assert(!p.includes("pen16paght"));
});

Deno.test("parseAiResponse happy path", () => {
  const s = parseAiResponse(
    '{"summary":"Busy cafe","score":8,"priority":"HOT","reason":"Strong web presence"}',
  );
  assert(s.score === 8 && s.priority === "HOT");
});

Deno.test("parseAiResponse handles fenced json", () => {
  const s = parseAiResponse(
    '```json\n{"summary":"x","score":5,"priority":"warm","reason":"y"}\n```',
  );
  assert(s.priority === "WARM");
});

Deno.test("parseAiResponse rejects garbage", () => {
  assertThrows(() => parseAiResponse("no json here"));
  assertThrows(() =>
    parseAiResponse('{"summary":"x","score":99,"priority":"HOT","reason":"y"}')
  );
  assertThrows(() =>
    parseAiResponse('{"summary":"x","score":5,"priority":"MAYBE","reason":"y"}')
  );
});

Deno.test("aiResearch full flow with mock fetch", async () => {
  const mock = ((() =>
    new Response(
      JSON.stringify({
        choices: [{
          message: {
            content:
              '{"summary":"ok","score":7,"priority":"WARM","reason":"mid"}',
          },
        }],
      }),
      { status: 200 },
    )) as unknown) as typeof fetch;
  const s = await aiResearch(lead, "key", mock);
  assert(s.score === 7 && s.priority === "WARM");
});

Deno.test("aiResearch surfaces http error", async () => {
  const mock =
    ((() => new Response("quota", { status: 429 })) as unknown) as typeof fetch;
  let threw = false;
  try {
    await aiResearch(lead, "key", mock);
  } catch (e) {
    threw = e instanceof Error && e.message.includes("AI 429");
  }
  assert(threw);
});
