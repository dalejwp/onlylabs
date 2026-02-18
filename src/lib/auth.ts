import crypto from "crypto";

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const s = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(s, "base64");
}

export type SessionPayload = { e: string; t: number };

export function getEnvAuth() {
  const email = process.env.MC_ADMIN_EMAIL;
  const password = process.env.MC_ADMIN_PASSWORD;
  const secret = process.env.MC_AUTH_SECRET;
  if (!email || !password || !secret) {
    throw new Error("Missing MC_ADMIN_EMAIL, MC_ADMIN_PASSWORD, or MC_AUTH_SECRET env vars");
  }
  return { email, password, secret };
}

export function signSession(payload: SessionPayload, secret: string) {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifySession(token: string, secret: string, maxAgeMs: number) {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = b64url(crypto.createHmac("sha256", secret).update(body).digest());

  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as SessionPayload;
  if (!payload?.e || !payload?.t) return null;
  if (Date.now() - payload.t > maxAgeMs) return null;
  return payload;
}
