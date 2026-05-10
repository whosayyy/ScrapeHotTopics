# ── Build Stage ──
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/server ./packages/server
COPY tsconfig.base.json ./

RUN npm ci --workspace=packages/server --include-workspace-root
RUN npm run build -w packages/server
RUN npm prune --omit=dev --workspace=packages/server

# ── Run Stage ──
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/node_modules ./node_modules
COPY --from=builder /app/packages/server/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

EXPOSE 3001

CMD ["node", "dist/index.js"]
