import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkMcpBearer } from "@/lib/mcpAuth";

// GET /api/memory
//   list memory entries. Optional query params:
//     ?prefix=projects     — only paths starting with "projects"
//     ?q=search text       — only entries whose content contains this text
//     ?limit=200           — max rows (default 200, hard cap 1000)
export async function GET(req: Request) {
  const unauth = checkMcpBearer(req);
  if (unauth) return unauth;

  const url = new URL(req.url);
  const prefix = url.searchParams.get("prefix") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const limitRaw = Number(url.searchParams.get("limit") ?? "200");
  const limit = Math.min(Math.max(1, isFinite(limitRaw) ? limitRaw : 200), 1000);

  try {
    const rows = await prisma.memory.findMany({
      where: {
        ...(prefix ? { path: { startsWith: prefix } } : {}),
        ...(q ? { content: { contains: q } } : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
      take: limit,
      select: { path: true, updatedAt: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, entries: rows });
  } catch (err) {
    console.error("[memory] GET list error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
