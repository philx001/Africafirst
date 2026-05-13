FROM node:20-alpine AS base
WORKDIR /app

FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run db:generate
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run db:generate
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
# Ne pas définir CRM_DEV_INSECURE_TLS ni NODE_TLS_REJECT_UNAUTHORIZED=0 (refus au démarrage de l’API).
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3001
CMD ["node", "dist/main"]
