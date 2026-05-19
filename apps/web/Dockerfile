# ============================================================
# Web Next.js — Dockerfile multi-stage
# Build context : RACINE du monorepo  (docker-compose.prod.yml)
# Prérequis : next.config.js doit avoir  output: 'standalone'
# ============================================================

# --- stage base ---
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# --- stage deps ---
FROM base AS deps
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/web/package*.json ./apps/web/
RUN npm ci --ignore-scripts

# --- stage builder ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY package*.json ./
RUN npm run build -w @crm/shared
WORKDIR /app/apps/web
RUN npm run build

# --- stage development (docker-compose.yml dev) ---
FROM base AS development
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/web/package*.json ./apps/web/
RUN npm install
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "run", "dev"]

# --- stage production ---
FROM base AS production
ENV NODE_ENV=production
# Ne pas définir CRM_DEV_INSECURE_TLS ni NODE_TLS_REJECT_UNAUTHORIZED=0
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs
WORKDIR /app/apps/web
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
