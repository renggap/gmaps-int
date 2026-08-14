import { assert, assertEquals } from "@std/assert";
import {
  hashPassword,
  signSession,
  verifyPassword,
  verifySession,
} from "./auth.ts";

Deno.test("password roundtrip", async () => {
  const h = await hashPassword("pen16paght");
  assert(h.startsWith("pbkdf2$"));
  assert(await verifyPassword("pen16paght", h));
  assert(!await verifyPassword("wrong", h));
});

Deno.test("unique salts", async () => {
  assert(await hashPassword("x") !== await hashPassword("x"));
});

Deno.test("session sign + verify", async () => {
  const t = await signSession(7, "secret");
  assertEquals(await verifySession(t, "secret"), 7);
  assertEquals(await verifySession(t, "other-secret"), null); // wrong key
  assertEquals(await verifySession(t.slice(0, -2) + "xx", "secret"), null); // forged sig
  assertEquals(await verifySession(undefined, "secret"), null);
});

Deno.test("session expiry", async () => {
  const t = await signSession(7, "secret", -1000);
  assertEquals(await verifySession(t, "secret"), null);
});
