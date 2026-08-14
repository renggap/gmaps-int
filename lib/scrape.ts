// Email discovery: crawl a lead's own site for public emails — homepage plus
// up to 2 contact-ish subpages (id + en naming). Never invents; null when none.

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const JUNK = /\.(png|jpg|jpeg|gif|webp|svg|css|js)$/i;
const CONTACT = /(contact|kontak|hubungi|about|tentang)/i;

type FetchLike = typeof fetch;

function extract(html: string): string | null {
  for (const m of html.matchAll(/mailto:([^"'?>\s]+)/g)) {
    const e = decodeURIComponent(m[1]).match(EMAIL_RE)?.[0];
    if (e && !JUNK.test(e) && !e.includes("example.")) return e;
  }
  return html.match(EMAIL_RE)?.find(
    (e) => !JUNK.test(e) && !e.includes("example.") && !e.includes("sentry"),
  ) ?? null;
}

async function get(
  fetchFn: FetchLike,
  url: string,
): Promise<string | null> {
  try {
    const res = await fetchFn(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GMapsInt/1.0)" },
    });
    if (!res.ok) return null;
    return (await res.text()).slice(0, 200_000);
  } catch {
    return null;
  }
}

export async function findPublicEmail(
  website: string,
  fetchFn: FetchLike = fetch,
): Promise<string | null> {
  const home = await get(fetchFn, website);
  if (!home) return null;
  const found = extract(home.toLowerCase());
  if (found) return found;

  // bounded contact-page crawl: up to 2 same-origin links
  const origin = new URL(website).origin;
  const links = [...home.matchAll(/href="([^"#]+)"/gi)]
    .map((m) => {
      try {
        return new URL(m[1], website).href;
      } catch {
        return null;
      }
    })
    .filter(
      (u): u is string => u !== null && u.startsWith(origin) && CONTACT.test(u),
    )
    .slice(0, 2);

  for (const link of links) {
    const page = await get(fetchFn, link);
    if (!page) continue;
    const e = extract(page.toLowerCase());
    if (e) return e;
  }
  return null;
}
