# Easyplay 架构迁移说明

## 1. 迁移目标

- 将项目从“前端目录 + 单独后端目录”调整为“按应用与服务分层”的结构。
- 统一 npm 启动入口到仓库根目录，降低启动和协作成本。
- 为四个游戏提供独立空间，便于功能扩展、资源隔离与后续构建升级。
- 保持现有访问能力：`/` 首页、`/api/*` 接口、`/ws/game` 实时通道。

## 2. 新目录结构

```text
Easyplay/
  apps/
    games/
      guess-number/
      snake-game/
      game-2048/
      chinese-chess/
  services/
    auth-system/
      src/
      tests/
      API.md
      DEPLOYMENT.md
      README.md
  docs/
    ARCHITECTURE_MIGRATION.md
  index.html
  main.js
  package.json
  package-lock.json
  jest.config.js
  .env.example
```

## 3. 目录职责规范

- `apps/games/*`：仅放各游戏前端资源（HTML/CSS/JS/静态素材），每个游戏目录独立维护。
- `services/auth-system`：仅放认证、用户、在线象棋房间、WebSocket、数据存储相关后端代码。
- 仓库根目录：放全局启动与测试入口（`package.json`、`jest.config.js`、`.env`）。
- `docs`：放架构、迁移、规范文档，不与代码逻辑耦合。

## 4. npm 启动链路调整

已将 npm 启动相关文件迁移到仓库根目录：

- `package.json`
- `package-lock.json`
- `jest.config.js`
- `.env.example`

根目录脚本：

- `npm start` -> `node services/auth-system/src/server.js`
- `npm run dev` -> `node --watch services/auth-system/src/server.js`
- `npm test` -> `jest --runInBand --coverage`

## 5. 路径与配置变更

### 5.1 首页游戏跳转

- `index.html` 中四个游戏卡片路由已更新为：
  - `./apps/games/guess-number/index.html`
  - `./apps/games/snake-game/index.html`
  - `./apps/games/game-2048/index.html`
  - `./apps/games/chinese-chess/index.html`

### 5.2 象棋前端基路径检测

- `apps/games/chinese-chess/app.js` 的路径标记从 `/chinese-chess/` 更新为 `/apps/games/chinese-chess/`，确保 API 与 WebSocket 基路径推导正确。

### 5.3 后端配置默认值

- `services/auth-system/src/config.js`
  - `.env` 加载来源切换为仓库根目录（`process.cwd()`）。
  - `PROJECT_ROOT` 回退路径调整为仓库根目录。

- `.env.example`
  - `DB_PATH=./services/auth-system/data/auth.db`
  - `FRONTEND_ROOT=../../`
  - `HTTPS_KEY_PATH=./services/auth-system/certs/server.key`
  - `HTTPS_CERT_PATH=./services/auth-system/certs/server.crt`

## 6. 开发与发布约定

- 所有开发命令在仓库根目录执行。
- 新增游戏必须放入 `apps/games/<game-name>/`，不得混放在仓库根目录。
- 后端新增模块统一放到 `services/auth-system/src/{routes,services,models,middleware,websocket}`。
- 若后续引入前端构建工具，按游戏维度独立接入，避免一次性改造全部游戏。

## 7. 验证清单

- `npm install` 成功。
- `npm start` 可启动服务并可访问 `/health`。
- `npm run dev` 可正常启动开发模式。
- 首页可正常打开并跳转四个游戏页面。
- 登录/注册接口可用，在线象棋页面能连接 `/ws/game`。
- `npm test` 全量测试通过。
