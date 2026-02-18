import { NextResponse } from "next/server";
import { getEnvAuth, signSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  const env = getEnvAuth();

  if (email !== env.email || password !== env.password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signSession({ e: email, t: Date.now() }, env.secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("mc_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
