import crypto from "crypto";
import { NextResponse } from "next/server";

// Bearer-token auth for endpoints that are called by the Mission Control MCP
// server (and any other automation). Intentionally separate from the session
// cookie auth used by the browser UI.
//
// The token lives in the MC_MCP_TOKEN env var. If it isn't set, every request
// is rejected — fail closed.

export function checkMcpBearer(req: Request): NextResponse | null {
  const expected = process.env.MC_MCP_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "MC_MCP_TOKEN is not configured on the server" },
      { status: 503 },
    );
  }

  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return NextResponse.json({ error: "missing bearer token" }, { status: 401 });
  }

  const presented = match[1];
  if (presented.length !== expected.length) {
    return NextResponse.json({ error: "bad token" }, { status: 401 });
  }
  if (!crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(expected))) {
    return NextResponse.json({ error: "bad token" }, { status: 401 });
  }

  return null;
}
