// simple in-memory sliding-window rate limiter
const hits = new Map<string, number[]>();

export function rateLimited(
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  return false;
}
