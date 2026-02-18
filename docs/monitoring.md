# Mission Control — Monitoring & Alerts

## Prometheus Metrics to Expose

Add a `/api/metrics` endpoint (or side-car exporter) exposing these metric names:

| Metric | Type | Description |
|--------|------|-------------|
| `mission_control_preflight_success` | Gauge (0/1) | 1 = last preflight passed, 0 = failed |
| `mission_control_http_requests_total` | Counter | HTTP requests by method, path, status |
| `mission_control_http_5xx_rate` | Gauge | 5xx rate over last minute |
| `mission_control_http_request_duration_seconds` | Histogram | Request latency |
| `mission_control_job_queue_depth` | Gauge | Pending jobs by jobType |
| `mission_control_job_failures_total` | Counter | Failed jobs by jobType |
| `mission_control_job_dead_total` | Counter | Jobs moved to dead-letter |
| `mission_control_db_connection_errors_total` | Counter | SQLite open/query errors |
| `mission_control_db_query_duration_seconds` | Histogram | Prisma query durations |
| `prisma_query_errors_total` | Counter | Prisma-level errors |
| `mission_control_idempotency_hits_total` | Counter | Idempotency cache hits |
| `mission_control_artifact_uploads_total` | Counter | Artifact upload count + size |

## Recommended Alert Rules (Prometheus / Grafana)

```yaml
groups:
  - name: mission-control
    rules:
      - alert: PreflightFailed
        expr: mission_control_preflight_success == 0
        for: 1m
        labels: { severity: critical }
        annotations:
          summary: "Mission Control preflight check failing"
          runbook: "https://github.com/org/repo/blob/main/docs/golden-path.md"

      - alert: High5xxRate
        expr: rate(mission_control_http_requests_total{status=~"5.."}[5m]) / rate(mission_control_http_requests_total[5m]) > 0.05
        for: 5m
        labels: { severity: critical }
        annotations:
          summary: "5xx rate > 5% for 5 minutes"

      - alert: JobFailureSpike
        expr: increase(mission_control_job_failures_total[10m]) > 5
        for: 2m
        labels: { severity: warning }
        annotations:
          summary: "Job failure spike detected"

      - alert: DeadLetterJobs
        expr: increase(mission_control_job_dead_total[5m]) > 0
        for: 0m
        labels: { severity: warning }
        annotations:
          summary: "Jobs moved to dead-letter queue"

      - alert: DBErrors
        expr: increase(mission_control_db_connection_errors_total[5m]) > 3
        for: 1m
        labels: { severity: critical }
        annotations:
          summary: "Database connectivity errors"
```

## Grafana Dashboard Panels (suggested)

1. **Health Overview** — preflight gauge + uptime
2. **Request Rate** — req/s by endpoint
3. **Error Rate** — 5xx % over time
4. **P50/P95/P99 Latency** — by endpoint
5. **Job Queue Depth** — pending/running by jobType
6. **Job Failure Rate** — failures and dead-letter over time
7. **DB Query Duration** — histogram heatmap

## Log Aggregation

Ship container stdout/stderr to your log aggregator (Loki, Datadog, etc.):

```bash
# Docker logging driver example
docker run --log-driver=loki \
  --log-opt loki-url="http://loki:3100/loki/api/v1/push" \
  --log-opt loki-labels="app=mission-control" \
  mission-control:latest
```

Key log patterns to alert on:
- `Preflight FAILED` — immediate P1
- `[health] DB check failed` — P1
- `[ci-migrate] error` — P1
- `DEPRECATED: raw content field` — P3 (migrate callers)
