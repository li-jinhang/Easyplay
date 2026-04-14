# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20.19.0

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
RUN sed -i 's#https\?://dl-cdn.alpinelinux.org/alpine#https://mirrors.aliyun.com/alpine#g' /etc/apk/repositories
COPY package.json package-lock.json ./

FROM base AS build
RUN --mount=type=cache,target=/var/cache/apk \
  apk add --no-cache python3 make g++
RUN --mount=type=cache,target=/root/.npm \
  npm ci
COPY . .
RUN npm run build \
  && npm prune --omit=dev \
  && npm cache clean --force

FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app
RUN sed -i 's#https\?://dl-cdn.alpinelinux.org/alpine#https://mirrors.aliyun.com/alpine#g' /etc/apk/repositories
RUN apk add --no-cache libstdc++

ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=26002 \
  FRONTEND_ROOT=/app \
  DB_PATH=/app/data/auth.db \
  DEV_HOT_RELOAD=false \
  ENABLE_HTTPS=false

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/ ./

RUN mkdir -p /app/data \
  && chown -R node:node /app

VOLUME ["/app/data"]
EXPOSE 26002

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "const http=require('http');const p=process.env.PORT||26002;const req=http.get({host:'127.0.0.1',port:p,path:'/health',timeout:2000},(res)=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.on('timeout',()=>{req.destroy();process.exit(1);});"

USER node
CMD ["node", "services/auth-system/src/server.js"]

FROM build AS dev
ENV NODE_ENV=development \
  HOST=0.0.0.0 \
  PORT=26002 \
  FRONTEND_ROOT=/app \
  DEV_HOT_RELOAD=true
EXPOSE 26002
CMD ["npm", "run", "dev"]
