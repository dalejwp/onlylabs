# Mission Control — Golden Path Runbook

One-liner commands for build, run, preflight, deploy, and rollback.

---

## Prerequisites

```bash
# Tools required on dev machine
node --version   # >= 20
docker --version # >= 24
npm --version    # >= 10
```

---

## 1. Local Development

```bash
# Clone + install
git clone <repo-url> && cd mission-control
npm ci
cp .env.example .env        # fill in MC_ADMIN_EMAIL, MC_ADMIN_PASSWORD, MC_AUTH_SECRET

# Generate Prisma client
npx prisma generate --schema=./prisma/schema.prisma

# Apply migrations
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Start dev server
npm run dev                  # http://localhost:3000
```

---

## 2. Build Image Locally

```bash
TAG=$(git rev-parse --short HEAD)
docker build --pull -t mission-control:${TAG} .
docker build --pull -t mission-control:latest .
```

---

## 3. Run Preflight (locally, against an image)

```bash
# Against local source
node tools/preflight.js

# Against a built image (ephemeral SQLite)
docker run --rm \
  -e DATABASE_URL=file:/tmp/test.db \
  -e NODE_ENV=production \
  -e MC_ADMIN_EMAIL=admin@example.com \
  -e MC_ADMIN_PASSWORD=secret \
  -e MC_AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
  mission-control:${TAG} node tools/preflight.js
```

---

## 4. Run Migrations

```bash
# Against local file (dev)
npx prisma migrate deploy --schema=./prisma/schema.prisma

# In CI / against staging DB
DATABASE_URL=file:/path/to/staging.db bash prisma/ci-migrate.sh

# Inside a running container
docker exec -it <container> bash prisma/ci-migrate.sh
```

---

## 5. docker-compose (local full stack)

```bash
# Start web + minio
docker compose up -d

# View logs
docker compose logs -f web

# Stop
docker compose down

# Rebuild after code change
docker compose up -d --build web
```

---

## 6. Production Deploy (VPS)

```bash
# Pull latest image
docker pull ghcr.io/<org>/mission-control:latest

# Stop old container
docker stop mission-control && docker rm mission-control

# Run new container
docker run -d \
  --name mission-control \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -v mc-data:/app/data \
  --env-file /etc/mission-control/.env \
  ghcr.io/<org>/mission-control:latest

# Reload nginx (if config changed)
envsubst < deploy/nginx.conf.tpl > /etc/nginx/sites-enabled/mission-control
nginx -t && systemctl reload nginx
```

---

## 7. Rollback

```bash
# Identify previous working image
docker images ghcr.io/<org>/mission-control

# Re-tag previous SHA as latest
PREV_SHA=<previous-short-sha>
docker tag ghcr.io/<org>/mission-control:${PREV_SHA} ghcr.io/<org>/mission-control:latest

# Stop current + start with previous image
docker stop mission-control && docker rm mission-control
docker run -d --name mission-control --restart unless-stopped \
  -p 127.0.0.1:3000:3000 -v mc-data:/app/data --env-file /etc/mission-control/.env \
  ghcr.io/<org>/mission-control:latest

# Verify health
curl -sf http://localhost:3000/_health && echo "OK"
```

> **Database rollback**: SQLite migrations are **forward-only** with Prisma. If the new schema is incompatible, restore from a DB snapshot taken before the migration.

---

## 8. Smoke Test After Deploy

```bash
# Quick health check
curl -sf https://mc.aionlylabs.online/_health | jq .

# Full smoke suite
SMOKE_BASE_URL=https://mc.aionlylabs.online \
SMOKE_AUTH_COOKIE="mc_session=<token>" \
node test/smoke.js
```

---

## 9. Secrets Handling

| Environment | Method |
|-------------|--------|
| Local dev | `.env` file (gitignored) |
| CI | GitHub Actions Secrets (`STAGING_DB_URL`, `PROD_DB_URL`, `STAGING_URL`) |
| Production | `/etc/mission-control/.env` (chmod 600, owned by deploy user) |

**Never commit** `MC_ADMIN_PASSWORD`, `MC_AUTH_SECRET`, `MATON_API_KEY`, `TELEGRAM_BOT_TOKEN`, `APIFY_API_TOKEN`, `OPENAI_API_KEY` to the repository.

---

## 10. Acceptance Checklist

- [ ] `docker build` completes from locked dependencies
- [ ] `node tools/preflight.js` exits 0 with valid env
- [ ] Preflight exits non-zero when `MC_AUTH_SECRET` is missing
- [ ] `npx prisma migrate deploy` runs cleanly inside container
- [ ] `GET /_health` returns `{"ok":true}` with status 200
- [ ] `POST /api/artifacts` accepts a file and returns `artifactId`
- [ ] `POST /api/run-from-artifact` enqueues a Job row in DB
- [ ] Duplicate requests with same `Idempotency-Key` return same response
- [ ] Smoke tests pass against staging
- [ ] Nginx config renders correctly via `envsubst`
