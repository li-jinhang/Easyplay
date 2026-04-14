ARG NODE_VERSION=20.19.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl tini \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./

FROM base AS prod-deps
RUN npm ci --omit=dev \
  && npm cache clean --force

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl tini \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system easyplay \
  && useradd --system --gid easyplay --home /app easyplay

ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=26002 \
  FRONTEND_ROOT=/app \
  DB_PATH=/app/data/auth.db \
  DEV_HOT_RELOAD=false \
  ENABLE_HTTPS=false

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist/ ./

RUN mkdir -p /app/data \
  && chown -R easyplay:easyplay /app

VOLUME ["/app/data"]
EXPOSE 26002

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/health || exit 1

USER easyplay
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "services/auth-system/src/server.js"]

FROM build AS dev
ENV NODE_ENV=development \
  HOST=0.0.0.0 \
  PORT=26002 \
  FRONTEND_ROOT=/app \
  DEV_HOT_RELOAD=true
EXPOSE 26002
CMD ["npm", "run", "dev"]
