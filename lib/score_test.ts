import { assertEquals } from "@std/assert";
import { scoreLead } from "./score.ts";

Deno.test("score: strong lead = HOT 10", () => {
  assertEquals(
    scoreLead({
      rating: 4.8,
      review_count: 600,
      website: "https://x",
      phone: "1",
    }),
    { fit_score: 10, priority: "HOT" },
  );
});

Deno.test("score: mid lead = WARM", () => {
  assertEquals(
    scoreLead({ rating: 4.2, review_count: 150, website: null, phone: "1" }),
    { fit_score: 6, priority: "WARM" },
  );
});

Deno.test("score: weak lead = SKIP", () => {
  assertEquals(
    scoreLead({ rating: 3.1, review_count: 2, website: null, phone: null }),
    { fit_score: 1, priority: "SKIP" },
  );
});

Deno.test("score: all nulls", () => {
  assertEquals(
    scoreLead({ rating: null, review_count: null, website: null, phone: null }),
    { fit_score: 1, priority: "SKIP" },
  );
});
