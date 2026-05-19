# ============================================================
# API NestJS — Dockerfile multi-stage
# Build context : RACINE du monorepo  (docker-compose.prod.yml)
# ============================================================

# --- stage base ---
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# --- stage deps : installation des dépendances depuis la racine ---
FROM base AS deps
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
RUN npm ci --ignore-scripts

# --- stage builder ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
# Copier les sources (shared + api)
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY package*.json ./
# Build shared, générer le client Prisma, compiler l'API
RUN npm run build -w @crm/shared
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npx nest build
# Élaguer les devDependencies depuis la racine
WORKDIR /app
RUN npm prune --omit=dev

# --- stage development (docker-compose.yml dev) ---
FROM base AS development
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/api/package*.json ./apps/api/
RUN npm install
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

# --- stage production ---
FROM base AS production
ENV NODE_ENV=production
# Ne pas définir CRM_DEV_INSECURE_TLS ni NODE_TLS_REJECT_UNAUTHORIZED=0
WORKDIR /app
# Dépendances élaguées
COPY --from=builder /app/node_modules ./node_modules
# Shared (utilisé via symlink npm workspaces)
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
# Artefacts API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
# Créer un utilisateur non-root
RUN addgroup --system --gid 1001 nestjs \
 && adduser  --system --uid 1001 nestjs
USER nestjs
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main"]
