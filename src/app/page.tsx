"use client";

import { useEffect, useMemo, useState } from "react";

type TaskStatus = "TODO" | "DOING" | "REVIEW" | "DONE";
type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  updatedAt: string;
};

const columns: { key: TaskStatus; label: string }[] = [
  { key: "TODO", label: "Todo" },
  { key: "DOING", label: "Doing" },
  { key: "REVIEW", label: "Review" },
  { key: "DONE", label: "Done" },
];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");

  async function refresh() {
    const res = await fetch("/api/tasks", { cache: "no-store" });
    const j = await res.json();
    setTasks(j.tasks ?? []);
  }

  useEffect(() => {
    refresh();

    const es = new EventSource("/api/sse");
    es.onmessage = (msg) => {
      try {
        const evt = JSON.parse(msg.data);
        if (evt.type?.startsWith("task.")) refresh();
      } catch {}
    };
    return () => es.close();
  }, []);

  async function createTask() {
    const t = title.trim();
    if (!t) return;
    setTitle("");
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: t }),
    });
  }

  async function moveTask(taskId: string, toStatus: TaskStatus) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskId, toStatus }),
    });
  }

  const grouped = useMemo(() => {
    const g: Record<TaskStatus, Task[]> = { TODO: [], DOING: [], REVIEW: [], DONE: [] };
    for (const t of tasks) g[t.status].push(t);
    return g;
  }, [tasks]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ARC Mission Control</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Live tasks, real execution. Todo, Doing, Review, Done.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold">Quick add task</div>
            <div className="mt-2 flex gap-2">
              <input
                className="w-72 rounded-md border border-zinc-200 px-3 py-2 text-sm"
                placeholder="What needs doing?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <button
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                onClick={createTask}
              >
                Create
              </button>
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Emails on task create and when moved to Done.
            </div>
          </div>
        </header>

        <main className="mt-8 grid gap-4 md:grid-cols-4">
          {columns.map((col) => (
            <section key={col.key} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{col.label}</h2>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                  {grouped[col.key].length}
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {grouped[col.key].map((t) => (
                  <div key={t.id} className="rounded-lg border border-zinc-200 p-3">
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {columns
                        .filter((c) => c.key !== col.key)
                        .map((c) => (
                          <button
                            key={c.key}
                            className="rounded-md border border-zinc-200 px-2 py-1 text-xs"
                            onClick={() => moveTask(t.id, c.key)}
                          >
                            Move to {c.label}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
                {grouped[col.key].length === 0 ? (
                  <div className="text-xs text-zinc-500">No tasks</div>
                ) : null}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
