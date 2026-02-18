#!/usr/bin/env bash
set -euo pipefail
echo "[ci-migrate] Running Prisma migrate deploy..."
npx prisma migrate deploy --schema=./prisma/schema.prisma
echo "[ci-migrate] Migrations applied successfully."
