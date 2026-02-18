import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";
import { sendEmail } from "@/lib/matonMail";

function statusLabel(s: string) {
  if (s === "TODO") return "Todo";
  if (s === "DOING") return "Doing";
  if (s === "REVIEW") return "Review";
  if (s === "DONE") return "Done";
  return s;
}

export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });
  return NextResponse.json({ ok: true, tasks });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const description = body.description ? String(body.description) : null;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const task = await prisma.task.create({
    data: { title, description, status: "TODO" },
  });

  await prisma.taskEvent.create({
    data: {
      taskId: task.id,
      type: "CREATED",
      payload: JSON.stringify({ title }),
    },
  });

  emitEvent({ type: "task.created", taskId: task.id });

  // Email on create
  await sendEmail(
    `Task created: ${task.title}`,
    `New task created.\n\nTitle: ${task.title}\nStatus: Todo\n\nArc`
  );

  return NextResponse.json({ ok: true, task });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const taskId = String(body.taskId ?? "");
  const toStatus = String(body.toStatus ?? "");

  const allowed = ["TODO", "DOING", "REVIEW", "DONE"];
  if (!taskId || !allowed.includes(toStatus)) {
    return NextResponse.json({ error: "taskId and valid toStatus required" }, { status: 400 });
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: toStatus as any },
  });

  await prisma.taskEvent.create({
    data: {
      taskId: task.id,
      type: "MOVED",
      payload: JSON.stringify({ toStatus }),
    },
  });

  emitEvent({ type: "task.moved", taskId: task.id, to: toStatus });

  // Email on done
  if (toStatus === "DONE") {
    await sendEmail(
      `Task completed: ${task.title}`,
      `Task moved to Done.\n\nTitle: ${task.title}\nStatus: ${statusLabel(toStatus)}\n\nArc`
    );
  }

  return NextResponse.json({ ok: true, task });
}
