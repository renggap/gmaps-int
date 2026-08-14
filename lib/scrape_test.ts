import { assertEquals } from "@std/assert";
import { findPublicEmail } from "./scrape.ts";

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/html" } });

Deno.test("scrape: finds mailto email", async () => {
  const f = () =>
    Promise.resolve(html(`<a href="mailto:info@klinik-smile.com">mail</a>`));
  assertEquals(
    await findPublicEmail("http://x.test", f),
    "info@klinik-smile.com",
  );
});

Deno.test("scrape: finds plain email, skips image junk", async () => {
  const f = () =>
    Promise.resolve(
      html(`contact: halo@dentist-jkt.id <img src="logo@2x.png">`),
    );
  assertEquals(
    await findPublicEmail("http://x.test", f),
    "halo@dentist-jkt.id",
  );
});

Deno.test("scrape: returns null when none", async () => {
  const f = () => Promise.resolve(html(`<p>no contact here</p>`));
  assertEquals(await findPublicEmail("http://x.test", f), null);
});

Deno.test("scrape: swallows fetch failure", async () => {
  const f = () => Promise.reject(new Error("network down"));
  assertEquals(await findPublicEmail("http://dead.test", f), null);
});

Deno.test("scrape: follows contact-page link", async () => {
  const pages: Record<string, string> = {
    "http://x.test/": `<a href="/contact-us">Contact</a> no email here`,
    "http://x.test/contact-us": `email us: cs@x.test`,
  };
  const f = (u: string | URL | Request) =>
    Promise.resolve(
      new Response(pages[String((u as URL).href ?? u)] ?? ""),
    );
  assertEquals(await findPublicEmail("http://x.test/", f), "cs@x.test");
});
