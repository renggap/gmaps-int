// PBKDF2-SHA256 password hashing + HMAC-signed session tokens
// ponytail: scrypt unavailable in this Deno build; PBKDF2 600k iterations is OWASP-approved. Upgrade path: node:crypto scrypt if ever needed.
const encoder = new TextEncoder();

export async function hashPassword(
  password: string,
  salt?: Uint8Array<ArrayBuffer>,
): Promise<string> {
  salt = salt ?? crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const derived = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", iterations: 600_000, salt },
      key,
      32 * 8,
    ),
  );
  return `pbkdf2$${toHex(salt)}$${toHex(derived)}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algo, saltHex, hashHex] = stored.split("$");
  if (algo !== "pbkdf2" || !saltHex || !hashHex) return false;
  const candidate = await hashPassword(password, fromHex(saltHex));
  return timingSafeEqual(candidate, stored);
}

function toHex(b: Uint8Array): string {
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function fromHex(h: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(h.length / 2));
  h.match(/.{2}/g)!.forEach((x, i) => out[i] = parseInt(x, 16));
  return out;
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// --- session tokens: {u:<userId>,e:<expMs>} base64url . HMAC-SHA256 sig
export const SESSION_COOKIE = "gmaps_session";
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;

async function hmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function b64url(b: ArrayBuffer | Uint8Array): string {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = "";
  for (const c of bytes) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - pad.length % 4) % 4));
  return new Uint8Array([...bin].map((c) => c.charCodeAt(0)));
}

export async function signSession(
  userId: number,
  secret: string,
  ttlMs = SESSION_TTL_MS,
): Promise<string> {
  const payload = b64url(
    encoder.encode(JSON.stringify({ u: userId, e: Date.now() + ttlMs })),
  );
  const sig = b64url(
    await crypto.subtle.sign(
      "HMAC",
      await hmacKey(secret),
      encoder.encode(payload),
    ),
  );
  return `${payload}.${sig}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<number | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = b64url(
    await crypto.subtle.sign(
      "HMAC",
      await hmacKey(secret),
      encoder.encode(payload),
    ),
  );
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(unb64url(payload)));
    if (typeof data.u !== "number" || typeof data.e !== "number") return null;
    if (Date.now() > data.e) return null;
    return data.u;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
    SESSION_TTL_MS / 1000
  }`;
}
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
