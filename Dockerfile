# syntax=docker/dockerfile:1
#
# Memorial do Jornal — production image (Coolify or any Docker host).
#
# Debian (glibc) rather than Alpine: @napi-rs/canvas (PDF thumbnails) ships
# prebuilt glibc binaries, and pdfjs-dist / tesseract.js are happiest there.
#
# Persistent data lives OUTSIDE the image, under /data (mount a volume there):
#   /data/pdfs     edition PDFs              (PDF_STORAGE_ROOT)
#   /data/uploads  images uploaded in admin  (UPLOADS_STORAGE_ROOT)
#   /data/config   db/smtp config from admin (APP_CONFIG_ROOT)
#
# On every start the container applies pending Prisma migrations, copies the
# committed public/uploads images into /data/uploads (never overwriting), then
# starts Next.js. Required env: DATABASE_URL, AUTH_SECRET,
# SETTINGS_ENCRYPTION_KEY, SITE_URL, APP_URL.

ARG NODE_VERSION=22

# ---- build -----------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS build
# Prisma's CLI engines need OpenSSL to detect/run.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# postinstall runs `prisma generate` (needs prisma/) and copies the pdf.js
# worker into public/ (needs scripts/ and the folder), so those go in before
# `npm ci` — keeps the dependency layer cached until package*.json or the
# schema change.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN mkdir -p public && npm ci --no-audit --no-fund

COPY . .
RUN npm run build \
 && npm prune --omit=dev --no-audit --no-fund

# ---- runtime ---------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
# OpenSSL for `prisma migrate deploy` (schema engine) at container start.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PDF_STORAGE_ROOT=/data/pdfs \
    UPLOADS_STORAGE_ROOT=/data/uploads \
    APP_CONFIG_ROOT=/data/config

# /app must be writable by the app user: tesseract.js (OCR) caches its
# Portuguese language data in the working directory on first use.
RUN mkdir -p /app /data/pdfs /data/uploads /data/config \
 && chown -R node:node /app /data
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json /app/next.config.ts /app/prisma.config.ts ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/src/generated ./src/generated

USER node
VOLUME ["/data"]
EXPOSE 3000

# Migrations can take a while on the first boot against an older database.
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Same steps as `npm run start:prod`, but `exec` hands PID 1 to Next so
# Coolify's stop/redeploy signals reach it directly.
CMD ["sh", "-c", "npx prisma migrate deploy && node scripts/seed-uploads.mjs && exec node_modules/.bin/next start -H \"$HOSTNAME\" -p \"$PORT\""]
