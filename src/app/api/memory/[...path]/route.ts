import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkMcpBearer } from "@/lib/mcpAuth";

type Ctx = { params: Promise<{ path: string[] }> };

function joinPath(parts: string[]): string | null {
  if (!parts?.length) return null;
  const joined = parts.map(decodeURIComponent).join("/").trim();
  if (!joined) return null;
  // Basic sanity: no leading/trailing slashes, no "..", no control chars.
  if (joined.startsWith("/") || joined.endsWith("/")) return null;
  if (joined.split("/").some((seg) => seg === "" || seg === "." || seg === "..")) return null;
  if (/[\x00-\x1f\x7f]/.test(joined)) return null;
  if (joined.length > 512) return null;
  return joined;
}

// GET /api/memory/<path...>  — read
export async function GET(req: Request, { params }: Ctx) {
  const unauth = checkMcpBearer(req);
  if (unauth) return unauth;

  const path = joinPath((await params).path);
  if (!path) return NextResponse.json({ error: "invalid path" }, { status: 400 });

  try {
    const row = await prisma.memory.findUnique({ where: { path } });
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, entry: row });
  } catch (err) {
    console.error("[memory] GET read error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PUT /api/memory/<path...>  — upsert (replaces content)
export async function PUT(req: Request, { params }: Ctx) {
  const unauth = checkMcpBearer(req);
  if (unauth) return unauth;

  const path = joinPath((await params).path);
  if (!path) return NextResponse.json({ error: "invalid path" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const content = typeof body?.content === "string" ? body.content : null;
  if (content === null) {
    return NextResponse.json({ error: "content (string) required" }, { status: 400 });
  }

  try {
    const entry = await prisma.memory.upsert({
      where: { path },
      update: { content },
      create: { path, content },
    });
    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    console.error("[memory] PUT error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH /api/memory/<path...>  — append to content (creates if missing)
export async function PATCH(req: Request, { params }: Ctx) {
  const unauth = checkMcpBearer(req);
  if (unauth) return unauth;

  const path = joinPath((await params).path);
  if (!path) return NextResponse.json({ error: "invalid path" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const content = typeof body?.content === "string" ? body.content : null;
  if (content === null) {
    return NextResponse.json({ error: "content (string) required" }, { status: 400 });
  }

  try {
    const existing = await prisma.memory.findUnique({ where: { path } });
    const joined = existing ? `${existing.content}\n${content}` : content;
    const entry = await prisma.memory.upsert({
      where: { path },
      update: { content: joined },
      create: { path, content: joined },
    });
    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    console.error("[memory] PATCH error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/memory/<path...>
export async function DELETE(req: Request, { params }: Ctx) {
  const unauth = checkMcpBearer(req);
  if (unauth) return unauth;

  const path = joinPath((await params).path);
  if (!path) return NextResponse.json({ error: "invalid path" }, { status: 400 });

  try {
    await prisma.memory.delete({ where: { path } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    console.error("[memory] DELETE error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
