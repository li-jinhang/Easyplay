# 部署说明

## 1. 环境要求

- Node.js 18+
- npm 9+

## 2. 安装与配置

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
copy .env.example .env
```

建议至少修改：

- `JWT_SECRET`: 生产环境必须替换为高强度随机字符串
- `DB_PATH`: 根据部署目录设置数据库文件位置
- `CORS_ORIGIN`: 生产环境建议配置为受信任域名，避免 `*`

## 3. 启动服务

```bash
npm start
```

默认端口：`3000`

服务同时提供：

- REST API：`/api/*`
- WebSocket：`/ws/game`
- 前端静态页面：`/`、`/chinese-chess/index.html`

## 4. 前端联调与发布要点

- 首页登录/注册 UI 位于仓库根目录 `index.html`
- 注册调用：`POST /api/register`（字段：`username`、`email`、`password`）
- 登录调用：`POST /api/login`（字段：`username`、`password`）
- 若前端和后端不同域，需在网关或反向代理中将 `/api/*` 代理到认证服务
- 同时将 `/ws/game` 代理为 WebSocket 通道
- 移动端适配已通过弹窗宽度与按钮换行策略处理，发布前建议进行真机回归
## 5. 生产建议

- 使用反向代理（如 Nginx）处理 HTTPS
- 使用进程管理器（如 PM2）守护进程
- 通过系统环境变量注入敏感信息，不要提交真实 `.env`
- 定期备份 SQLite 数据库文件（包含用户邮箱等注册信息）
- 对 `users`、`rooms`、`game_records` 等关键数据做定时备份
- 启用日志采集，监控 4xx/5xx 与 WS 连接异常
## 6. 健康检查

- 接口：`GET /health`
- 返回：`{"status":"ok"}`

## 7. Nginx 反向代理示例

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location /ws/game {
    proxy_pass http://127.0.0.1:3000/ws/game;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```
