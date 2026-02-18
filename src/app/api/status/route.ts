import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [todo, doing, review, done] = await Promise.all([
    prisma.task.count({ where: { status: "TODO" } }),
    prisma.task.count({ where: { status: "DOING" } }),
    prisma.task.count({ where: { status: "REVIEW" } }),
    prisma.task.count({ where: { status: "DONE" } }),
  ]);

  return NextResponse.json({
    ok: true,
    tasks: { todo, doing, review, done },
    time: new Date().toISOString(),
  });
}
