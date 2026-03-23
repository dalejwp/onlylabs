import crypto from "crypto";

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
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token: string, secret: string, maxAgeMs: number) {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");

  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  if (!payload?.e || !payload?.t) return null;
  if (Date.now() - payload.t > maxAgeMs) return null;
  return payload;
}
