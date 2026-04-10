# 用户注册登录 + 在线象棋系统

一个基于 Node.js + Express + SQLite + WebSocket 的完整小游戏平台后端，已集成用户注册登录和在线中国象棋对战能力。

## 功能概览

- 用户注册：`POST /api/register`
- 用户登录：`POST /api/login`
- 登录态验证：`GET /api/me`（支持 `Bearer Token` 或 `HttpOnly Cookie`）
- 象棋房间管理：创建/加入/状态管理（等待中、游戏中、已结束）
- 象棋实时对局：WebSocket 实时走子同步、将军/吃子/胜负事件广播
- 象棋规则引擎：标准中国象棋走法校验、回合控制、服务端反作弊验证
- 棋局持久化：房间、棋谱、积分、战绩存储
- 断线恢复：服务重启后可恢复未结束房间状态
- 玩家在线状态：连接状态实时更新
- 聊天功能：房间内文本聊天
- 倒计时机制：超时自动判负
- 用户名/邮箱唯一性检查
- 密码哈希存储（`bcryptjs`）
- 基础输入校验与错误处理
- 静态资源托管（HTML/CSS/JS/图片）
- 开发态热重载（文件变化自动刷新）
- 可配置 CORS / 缓存策略 / HTTPS / 访问日志
- 接口限流与基础安全防护（Helmet、防注入参数化 SQL、文本过滤）

注册字段规则：

- `username`：3-32 位字母/数字/下划线
- `email`：合法邮箱格式，最大 128 位
- `password`：固定 8 位

## 技术栈

- Node.js + Express
- SQLite3
- bcryptjs
- jsonwebtoken
- ws（WebSocket）
- express-validator
- Jest + Supertest

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 复制环境变量文件并按需修改

```bash
copy .env.example .env
```

3. 启动服务
cd auth-system

```bash
npm start
```

服务默认运行在 `http://localhost:3000`。

在线象棋前端入口：`http://localhost:3000/chinese-chess/index.html`

开发模式（含 Node 进程热更新）：

```bash
npm run dev
```

## 前端托管说明

- 默认会托管仓库根目录（`FRONTEND_ROOT=../`）下的前端文件。
- 支持目录路由（如 `/game-2048`）和 HTML 直出（如 `/guess-number/index.html`）。
- 开发环境下启用 `DEV_HOT_RELOAD=true` 时，前端文件改动会自动触发浏览器刷新。
- 生产环境会对静态资源自动添加缓存头；带 hash 的文件会使用长期缓存。

## HTTPS 配置

在 `.env` 中设置：

```env
ENABLE_HTTPS=true
HTTPS_KEY_PATH=./certs/server.key
HTTPS_CERT_PATH=./certs/server.crt
```

然后使用 `npm start` 启动，即可通过 HTTPS 提供服务。

## 运行测试

```bash
npm test
```

测试会执行单元测试与集成测试，并输出覆盖率报告。

## 在线象棋快速体验

1. 打开首页并完成两个账号注册登录
2. 进入 `在线象棋` 页面
3. A 用户创建房间（选红/黑）
4. B 用户输入房间号加入
5. 双方在同一房间实时对弈与聊天

## WebSocket 说明

- 地址：`ws://localhost:3000/ws/game`（HTTPS 下使用 `wss://`）
- 鉴权：支持 Query `token` / `Authorization Bearer` / Cookie `token`
- 关键消息：
- `join_room`：加入房间并同步状态
- `move`：提交走子（服务端验证）
- `chat`：发送聊天
- `sync_state`：主动拉取房间快照

## 目录结构

```text
auth-system/
  src/
    middleware/
    models/
    routes/
    services/
    websocket/
    app.js
    config.js
    db.js
    server.js
  tests/
    integration/
    unit/
  API.md
  DEPLOYMENT.md
  TEST_REPORT.md
```
