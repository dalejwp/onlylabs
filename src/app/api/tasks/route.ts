import { NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitEvent } from "@/lib/events";
import { sendEmail } from "@/lib/matonMail";
import {
  tasksCreatedTotal,
  tasksMovedTotal,
  dbErrorsTotal,
  http5xxTotal,
} from "@/lib/metrics";

function statusLabel(s: string) {
  if (s === "TODO") return "Todo";
  if (s === "DOING") return "Doing";
  if (s === "REVIEW") return "Review";
  if (s === "DONE") return "Done";
  return s;
}

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    });
    return NextResponse.json({ ok: true, tasks });
  } catch (err) {
    dbErrorsTotal.inc({ route: "/api/tasks" });
    http5xxTotal.inc({ route: "/api/tasks" });
    console.error("[tasks] GET error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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

    tasksCreatedTotal.inc();
    emitEvent({ type: "task.created", taskId: task.id });

    await sendEmail(
      `Task created: ${task.title}`,
      `New task created.\n\nTitle: ${task.title}\nStatus: Todo\n\nArc`
    );

    return NextResponse.json({ ok: true, task });
  } catch (err) {
    dbErrorsTotal.inc({ route: "/api/tasks" });
    http5xxTotal.inc({ route: "/api/tasks" });
    console.error("[tasks] POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const taskId = String(body.taskId ?? "");
    const toStatus = String(body.toStatus ?? "");

    const allowed = ["TODO", "DOING", "REVIEW", "DONE"];
    if (!taskId || !allowed.includes(toStatus)) {
      return NextResponse.json({ error: "taskId and valid toStatus required" }, { status: 400 });
    }

    // Fetch current status for the metric label
    const before = await prisma.task.findUnique({ where: { id: taskId }, select: { status: true } });

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status: toStatus as TaskStatus },
    });

    await prisma.taskEvent.create({
      data: {
        taskId: task.id,
        type: "MOVED",
        payload: JSON.stringify({ toStatus }),
      },
    });

    tasksMovedTotal.inc({
      from_status: before?.status ?? "UNKNOWN",
      to_status: toStatus,
    });
    emitEvent({ type: "task.moved", taskId: task.id, to: toStatus });

    if (toStatus === "DONE") {
      await sendEmail(
        `Task completed: ${task.title}`,
        `Task moved to Done.\n\nTitle: ${task.title}\nStatus: ${statusLabel(toStatus)}\n\nArc`
      );
    }

    return NextResponse.json({ ok: true, task });
  } catch (err) {
    dbErrorsTotal.inc({ route: "/api/tasks" });
    http5xxTotal.inc({ route: "/api/tasks" });
    console.error("[tasks] PATCH error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
