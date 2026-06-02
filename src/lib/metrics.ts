import { Registry, Counter, Gauge, collectDefaultMetrics } from 'prom-client';

type McMetrics = {
  registry: Registry;
  tasksCreatedTotal: Counter;
  tasksMovedTotal: Counter<'from_status' | 'to_status'>;
  jobsEnqueuedTotal: Counter<'job_type'>;
  idempotencyHitsTotal: Counter;
  idempotencyMissesTotal: Counter;
  dbErrorsTotal: Counter<'route'>;
  http5xxTotal: Counter<'route'>;
  preflightSuccess: Gauge;
  uptimeSeconds: Gauge;
};

// Singleton — safe across Next.js hot reloads and multiple module evaluations
const g = globalThis as unknown as { __mcMetrics?: McMetrics };

if (!g.__mcMetrics) {
  const reg = new Registry();
  reg.setDefaultLabels({ app: 'mission-control' });
  collectDefaultMetrics({ register: reg });

  g.__mcMetrics = {
    registry: reg,

    // ── Tasks ──────────────────────────────────────────────────────────────
    tasksCreatedTotal: new Counter({
      name: 'mission_control_tasks_created_total',
      help: 'Total tasks created',
      registers: [reg],
    }),

    tasksMovedTotal: new Counter({
      name: 'mission_control_tasks_moved_total',
      help: 'Total task status transitions',
      labelNames: ['from_status', 'to_status'],
      registers: [reg],
    }),

    // ── Jobs ───────────────────────────────────────────────────────────────
    jobsEnqueuedTotal: new Counter({
      name: 'mission_control_jobs_enqueued_total',
      help: 'Total jobs enqueued',
      labelNames: ['job_type'],
      registers: [reg],
    }),

    // ── Idempotency ────────────────────────────────────────────────────────
    idempotencyHitsTotal: new Counter({
      name: 'mission_control_idempotency_hits_total',
      help: 'Total idempotency cache hits (duplicate requests replayed)',
      registers: [reg],
    }),

    idempotencyMissesTotal: new Counter({
      name: 'mission_control_idempotency_misses_total',
      help: 'Total idempotency cache misses (new requests processed)',
      registers: [reg],
    }),

    // ── DB errors ──────────────────────────────────────────────────────────
    dbErrorsTotal: new Counter({
      name: 'mission_control_db_errors_total',
      help: 'Total database errors caught at route level',
      labelNames: ['route'],
      registers: [reg],
    }),

    // ── HTTP errors ────────────────────────────────────────────────────────
    http5xxTotal: new Counter({
      name: 'mission_control_http_5xx_total',
      help: 'Total 5xx responses',
      labelNames: ['route'],
      registers: [reg],
    }),

    // ── Preflight & uptime ─────────────────────────────────────────────────
    preflightSuccess: new Gauge({
      name: 'mission_control_preflight_success',
      help: '1 if startup preflight passed, 0 if failed',
      registers: [reg],
    }),

    uptimeSeconds: new Gauge({
      name: 'mission_control_uptime_seconds',
      help: 'Process uptime in seconds',
      registers: [reg],
      collect() { this.set(process.uptime()); },
    }),
  };

  // Process started successfully — preflight passed
  g.__mcMetrics.preflightSuccess.set(1);
}

export const {
  registry,
  tasksCreatedTotal,
  tasksMovedTotal,
  jobsEnqueuedTotal,
  idempotencyHitsTotal,
  idempotencyMissesTotal,
  dbErrorsTotal,
  http5xxTotal,
  preflightSuccess,
  uptimeSeconds,
} = g.__mcMetrics!;
