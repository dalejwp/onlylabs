# Mission Control

Task board and automation hub — Next.js + Prisma + SQLite, served behind Nginx on a VPS.

## Quick Start (local dev)

```bash
git clone <repo-url> && cd mission-control
npm ci
cp .env.example .env            # fill in required vars (see below)
npx prisma generate --schema=./prisma/schema.prisma
npx prisma migrate deploy --schema=./prisma/schema.prisma
npm run dev                     # http://localhost:3000
```

## Quick Start (Docker)

```bash
cp .env.example .env            # fill in required vars
docker compose up -d            # starts web (port 3000) + minio (port 9000)
```

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite file path e.g. `file:./mission-control.db` |
| `NODE_ENV` | `production` or `development` |
| `MC_ADMIN_EMAIL` | Admin login email |
| `MC_ADMIN_PASSWORD` | Admin login password |
| `MC_AUTH_SECRET` | 32+ byte hex secret for session signing |
| `MATON_API_KEY` | Maton API key for email relay |
| `MC_NOTIFY_EMAIL_TO` | Notification recipient email |
| `MC_NOTIFY_EMAIL_FROM` | Notification sender email |

Optional — see [.env.example](.env.example) for the full list.

Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/_health` | public | Health check — returns `{"ok":true}` |
| `GET` | `/api/status` | session | Task counts by status |
| `GET` | `/api/tasks` | session | List tasks |
| `POST` | `/api/tasks` | session | Create task |
| `PATCH` | `/api/tasks` | session | Move task status |
| `GET` | `/api/sse` | session | Server-Sent Events stream |
| `POST` | `/api/artifacts` | session | Upload a file artifact |
| `GET` | `/api/artifacts?id=` | session | Get artifact metadata |
| `POST` | `/api/run-from-artifact` | session | Schedule job from artifact |
| `POST` | `/api/login` | public | Login |
| `POST` | `/api/logout` | session | Logout |

## Idempotency

Send `Idempotency-Key: <uuid>` on any POST to get idempotent behaviour.
Duplicate keys within 24 hours return the cached response.

```bash
curl -X POST https://mc.example.com/api/tasks \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Cookie: mc_session=<token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"My task"}'
```

## Migrations

```bash
# Apply pending migrations
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Check status
npx prisma migrate status --schema=./prisma/schema.prisma
```

## Rollback

See [docs/golden-path.md](docs/golden-path.md) for full rollback procedure.

Short version:
```bash
# Re-tag previous image and restart
docker tag ghcr.io/<org>/mission-control:<prev-sha> ghcr.io/<org>/mission-control:latest
docker restart mission-control
```

## CI/CD

See [.github/workflows/ci.yml](.github/workflows/ci.yml).

Pipeline: **lint → build image → preflight → migrate (staging) → smoke tests → push**

Required secrets in GitHub:
- `STAGING_DB_URL` — staging SQLite path or URL
- `STAGING_URL` — staging base URL for smoke tests
- `STAGING_SESSION_COOKIE` — authenticated session cookie for smoke tests

## Documentation

- [Golden Path Runbook](docs/golden-path.md) — build / run / deploy / rollback
- [Monitoring Guide](docs/monitoring.md) — Prometheus metrics + alert rules
- [Obsidian MCP Setup](docs/obsidian-mcp-setup.md) — wire an Obsidian vault into Claude Code as cross-device persistent memory
