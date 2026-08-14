import { assert, assertFalse } from "@std/assert";
import { rateLimited } from "./ratelimit.ts";

Deno.test("rateLimited allows max then blocks", () => {
  const key = `k-${crypto.randomUUID()}`;
  for (let i = 0; i < 5; i++) assertFalse(rateLimited(key, 5, 60_000));
  assert(rateLimited(key, 5, 60_000));
});

Deno.test("rateLimited keys are independent", () => {
  const a = `a-${crypto.randomUUID()}`;
  for (let i = 0; i < 5; i++) rateLimited(a, 5, 60_000);
  assertFalse(rateLimited(`b-${crypto.randomUUID()}`, 5, 60_000));
});

Deno.test("rateLimited window expiry frees slot after window", () => {
  const key = `w-${crypto.randomUUID()}`;
  assert(!rateLimited(key, 1, 60_000)); // first hit allowed
  assert(rateLimited(key, 1, 60_000)); // second blocked inside window
  // with negative window, all past timestamps are filtered out, so slot frees
  assert(!rateLimited(key, 1, -1));
});
