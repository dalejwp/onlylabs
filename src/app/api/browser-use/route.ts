import { NextResponse } from "next/server";
import { checkMcpBearer } from "@/lib/mcpAuth";

// POST /api/browser-use
//   Run a Browser Use cloud task. Body: { task: string, model?: string, country?: string }
//
// Credentials (server-side env, never in the request):
//   BROWSER_USE_API_KEY         (required)
//   BROWSER_USE_PROFILE_ID      (optional)
//   BROWSER_USE_WORKSPACE_ID    (optional)

export async function POST(req: Request) {
  const unauth = checkMcpBearer(req);
  if (unauth) return unauth;

  const apiKey = process.env.BROWSER_USE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "BROWSER_USE_API_KEY is not configured on the server" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const task = typeof body?.task === "string" ? body.task.trim() : "";
  if (!task) {
    return NextResponse.json({ error: "task (string) required" }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    task,
    model: typeof body?.model === "string" ? body.model : "claude-opus-4.7",
    proxy_country_code: typeof body?.country === "string" ? body.country : "us",
  };
  if (process.env.BROWSER_USE_PROFILE_ID) payload.profile_id = process.env.BROWSER_USE_PROFILE_ID;
  if (process.env.BROWSER_USE_WORKSPACE_ID) payload.workspace_id = process.env.BROWSER_USE_WORKSPACE_ID;

  try {
    const upstream = await fetch("https://api.browser-use.com/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* keep raw */ }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "browser-use upstream error", status: upstream.status, body: parsed },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, result: parsed });
  } catch (err) {
    console.error("[browser-use] fetch error:", err);
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
