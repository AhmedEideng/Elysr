# ============================================================
# Elysr Medical — Production Dockerfile
# ============================================================
# Multi-stage build:
#   1. Build the SPA (Vite + prerender)
#   2. Production runtime (Node SSR server)
#
# Usage:
#   docker build -t elysr-medical .
#   docker run -p 8080:8080 --env-file .env elysr-medical
# ============================================================

# ── Stage 1: Build ──
FROM node:24-alpine AS build

WORKDIR /app

# Install ALL dependencies (build + runtime)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build + prerender
RUN npm run build

# ⚡ Prune node_modules to remove devDependencies for an ultra-lean and secure runtime image
RUN npm prune --omit=dev

# ── Stage 2: Runtime ──
FROM node:24-alpine AS runtime

WORKDIR /app

# Create non-root user
RUN addgroup -S elysr && adduser -S elysr -G elysr

# Copy only production deps + needed files
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/api ./api
COPY --from=build /app/package.json ./

# Security: drop root
USER elysr

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/index.js"]
