"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TaskStatus = "TODO" | "DOING" | "REVIEW" | "DONE";
type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  updatedAt: string;
};

const COLUMNS: {
  key: TaskStatus;
  label: string;
  topBorder: string;
  dot: string;
  badge: string;
}[] = [
  {
    key: "TODO",
    label: "Todo",
    topBorder: "border-t-blue-400",
    dot: "bg-blue-400",
    badge: "bg-blue-50 text-blue-700",
  },
  {
    key: "DOING",
    label: "Doing",
    topBorder: "border-t-amber-400",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700",
  },
  {
    key: "REVIEW",
    label: "Review",
    topBorder: "border-t-violet-400",
    dot: "bg-violet-400",
    badge: "bg-violet-50 text-violet-700",
  },
  {
    key: "DONE",
    label: "Done",
    topBorder: "border-t-emerald-400",
    dot: "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700",
  },
];

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Logo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const res = await fetch("/api/tasks", { cache: "no-store" });
    const j = await res.json();
    setTasks(j.tasks ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      const j = await res.json();
      if (!cancelled) setTasks(j.tasks ?? []);
    })();
    const es = new EventSource("/api/sse");
    es.onmessage = (msg) => {
      try {
        const evt = JSON.parse(msg.data);
        if (evt.type?.startsWith("task.")) refresh();
      } catch {}
    };
    return () => {
      cancelled = true;
      es.close();
    };
  }, []);

  async function createTask() {
    const t = title.trim();
    if (!t || creating) return;
    setCreating(true);
    setTitle("");
    // Optimistic insert
    const temp: Task = {
      id: `_opt_${Date.now()}`,
      title: t,
      description: null,
      status: "TODO",
      updatedAt: new Date().toISOString(),
    };
    setTasks((prev) => [temp, ...prev]);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: t }),
    });
    await refresh();
    setCreating(false);
    inputRef.current?.focus();
  }

  async function moveTask(taskId: string, toStatus: TaskStatus) {
    if (taskId.startsWith("_opt_")) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: toStatus, updatedAt: new Date().toISOString() } : t))
    );
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">

        {/* ── Header ── */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm">
              <Logo />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">
                Mission Control
              </h1>
              <p className="text-xs text-zinc-400">Live tasks · real execution</p>
            </div>
          </div>

          {/* Quick add */}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              className="w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-100 sm:w-64"
              placeholder="New task… press Enter"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTask()}
              disabled={creating}
            />
            <button
              className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-700 disabled:opacity-40"
              onClick={createTask}
              disabled={creating || !title.trim()}
            >
              {creating ? "Adding…" : "Add"}
            </button>
          </div>
        </header>

        {/* ── Board ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const cards = grouped[col.key];
            return (
              <section
                key={col.key}
                className={`flex flex-col rounded-xl border border-zinc-200 border-t-2 ${col.topBorder} bg-white shadow-sm`}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                    <h2 className="text-sm font-semibold">{col.label}</h2>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${col.badge}`}>
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 px-3 pb-4">
                  {cards.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-zinc-200 py-8 text-center text-xs text-zinc-400">
                      No tasks
                    </div>
                  ) : (
                    cards.map((t) => (
                      <div
                        key={t.id}
                        className="group relative rounded-lg border border-zinc-100 bg-zinc-50 p-3 hover:border-zinc-200 hover:bg-white hover:shadow-sm"
                      >
                        <p className="text-sm font-medium leading-snug text-zinc-900">
                          {t.title}
                        </p>
                        {t.description && (
                          <p className="mt-1 text-xs leading-relaxed text-zinc-500 line-clamp-2">
                            {t.description}
                          </p>
                        )}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <span className="text-[11px] tabular-nums text-zinc-400">
                            {relativeTime(t.updatedAt)}
                          </span>
                          {/* Move buttons — visible on hover */}
                          <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100">
                            {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                              <button
                                key={c.key}
                                onClick={() => moveTask(t.id, c.key)}
                                title={`Move to ${c.label}`}
                                className="rounded px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
