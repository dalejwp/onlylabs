FROM node:20.18.0-bullseye

WORKDIR /app

# Install deps (cached layer)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy source
COPY . .

# Generate Prisma client at build time (not runtime)
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build Next.js
RUN npm run build

# Persistent data dir for SQLite volume mount
RUN mkdir -p /app/data

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["node", "/app/tools/entrypoint.js"]
