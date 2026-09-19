# ===========================================================================
# WaterFlow OS — Express Gateway Dockerfile
# ===========================================================================

FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app ./

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "server.js"]
