# syntax=docker/dockerfile:1.7
#
# Multi-stage production image for the Destino SF Next.js app.
# - Uses Next.js standalone output (next.config.js -> output: 'standalone').
# - Debian "bookworm-slim" (glibc) base so Prisma's `native` engine target
#   works on both amd64 and arm64 (the Dokploy Hetzner ARM box) without
#   touching schema.prisma binaryTargets.
# - pnpm pinned via corepack to match package.json "packageManager".
#
# Built in GitHub Actions (see .github/workflows/build-and-push.yml) and run
# as a prebuilt image by Dokploy — `next build` never runs on the VPS.

ARG NODE_IMAGE=node:20-bookworm-slim

# ---------- deps: install node_modules only (cached layer) ----------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app

# Prisma needs openssl at install/generate time.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# package.json has `postinstall: prisma generate`, so the schema must be
# present before `pnpm install` or the install itself fails.
COPY package.json pnpm-lock.yaml .npmrc .pnpmrc ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- builder: prisma generate + next build ----------
FROM ${NODE_IMAGE} AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# --- Build-time public env (Next.js inlines NEXT_PUBLIC_* at build) ---
# These MUST be real values at build time or the client bundle ships blanks.
# Wired from GitHub Actions Variables/Secrets in build-and-push.yml.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ARG NEXT_PUBLIC_APP_VERSION
ARG NEXT_PUBLIC_ADMIN_API_KEY
ARG NEXT_PUBLIC_MIXPANEL_TOKEN
ARG NEXT_PUBLIC_UMAMI_SRC
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ARG NEXT_PUBLIC_STORE_ADDRESS
ARG NEXT_PUBLIC_STORE_HOURS
ARG NEXT_PUBLIC_SANITY_PROJECT_ID
ARG NEXT_PUBLIC_SANITY_DATASET

# --- Build-time server env ---
# src/lib/env/env.ts runs `envSchema.parse(process.env)` at module scope, so
# `next build` needs every required var to exist. Server-only values are
# placeholders (same approach as pre-deployment.yml CI builds) — the real
# values come from Dokploy's runtime env, which this builder stage never
# reaches. DATABASE_URL/DIRECT_URL may be real (BUILD_* secrets) if static
# generation needs DB reads.
ARG DATABASE_URL
ARG DIRECT_URL
ARG SENTRY_AUTH_TOKEN

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT \
    NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION \
    NEXT_PUBLIC_ADMIN_API_KEY=$NEXT_PUBLIC_ADMIN_API_KEY \
    NEXT_PUBLIC_MIXPANEL_TOKEN=$NEXT_PUBLIC_MIXPANEL_TOKEN \
    NEXT_PUBLIC_UMAMI_SRC=$NEXT_PUBLIC_UMAMI_SRC \
    NEXT_PUBLIC_UMAMI_WEBSITE_ID=$NEXT_PUBLIC_UMAMI_WEBSITE_ID \
    NEXT_PUBLIC_STORE_ADDRESS=$NEXT_PUBLIC_STORE_ADDRESS \
    NEXT_PUBLIC_STORE_HOURS=$NEXT_PUBLIC_STORE_HOURS \
    NEXT_PUBLIC_SANITY_PROJECT_ID=$NEXT_PUBLIC_SANITY_PROJECT_ID \
    NEXT_PUBLIC_SANITY_DATASET=$NEXT_PUBLIC_SANITY_DATASET \
    DATABASE_URL=${DATABASE_URL:-postgresql://build:build@localhost:5432/build} \
    DIRECT_URL=${DIRECT_URL:-postgresql://build:build@localhost:5432/build} \
    SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
    SUPABASE_SERVICE_ROLE_KEY=build-placeholder \
    ADMIN_EMAIL=build@placeholder.local \
    FROM_EMAIL=build@placeholder.local \
    RESEND_API_KEY=build-placeholder \
    SQUARE_ENVIRONMENT=sandbox \
    SQUARE_LOCATION_ID=build-placeholder \
    SQUARE_ACCESS_TOKEN=build-placeholder \
    SQUARE_WEBHOOK_SECRET=build-placeholder \
    SHIPPING_ORIGIN_CITY="San Francisco" \
    SHIPPING_ORIGIN_EMAIL=build@placeholder.local \
    SHIPPING_ORIGIN_NAME=build-placeholder \
    SHIPPING_ORIGIN_PHONE=4155550000 \
    SHIPPING_ORIGIN_STATE=CA \
    SHIPPING_ORIGIN_STREET1=build-placeholder \
    SHIPPING_ORIGIN_ZIP=94102 \
    SHIPPO_API_KEY=build-placeholder \
    SHOP_NAME="Destino SF" \
    UPSTASH_REDIS_REST_TOKEN=build-placeholder \
    UPSTASH_REDIS_REST_URL=https://build-placeholder.upstash.io \
    HUSKY=0 \
    NEXT_TELEMETRY_DISABLED=1 \
    CI=true

# The build needs more heap than Node's ~2 GB default (OOMs otherwise).
# GitHub-hosted public-repo runners (amd64 and arm64) have 16 GB RAM.
ENV NODE_OPTIONS=--max-old-space-size=6144

# Unset OPTIONAL vars that arrived as empty strings (unset build-args come
# through as "" and src/env.ts (t3-env, no emptyStringAsUndefined) rejects
# empty strings for .url().optional() fields). Required vars stay put so a
# missing value still fails the build loudly.
# `prebuild` runs `prisma generate`; then `next build` emits .next/standalone.
RUN set -e; \
    for v in NEXT_PUBLIC_SENTRY_DSN NEXT_PUBLIC_SENTRY_ENVIRONMENT \
             NEXT_PUBLIC_APP_VERSION NEXT_PUBLIC_ADMIN_API_KEY \
             NEXT_PUBLIC_MIXPANEL_TOKEN NEXT_PUBLIC_UMAMI_SRC \
             NEXT_PUBLIC_UMAMI_WEBSITE_ID NEXT_PUBLIC_STORE_ADDRESS \
             NEXT_PUBLIC_STORE_HOURS NEXT_PUBLIC_SANITY_PROJECT_ID \
             NEXT_PUBLIC_SANITY_DATASET SENTRY_AUTH_TOKEN; do \
      eval "val=\${$v:-}"; \
      if [ -z "$val" ]; then unset "$v"; fi; \
    done; \
    pnpm build

# ---------- runner: minimal standalone server ----------
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run as non-root.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Standalone output bundles a minimal node_modules + server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# NOTE: deliberately NO strict HEALTHCHECK here. /api/health can 503 at
# baseline (degraded DB latency), and a 2xx-only HEALTHCHECK makes Swarm
# crash-loop the service (ready-set gotcha). Liveness is handled by the
# Dokploy healthCheckSwarm override (accepts any HTTP response).

CMD ["node", "server.js"]
