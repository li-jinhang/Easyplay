# API 接口文档

## 基础信息

- Base URL: `http://localhost:3000`
- Content-Type: `application/json`

---

## 1. 用户注册

- 方法：`POST`
- 路径：`/api/register`

请求体：

```json
{
  "username": "demo_user",
  "email": "demo_user@example.com",
  "password": "12345678"
}
```

字段规则：

- `username`: 必填，3-32 位，仅允许字母/数字/下划线
- `email`: 必填，合法邮箱格式，最大 128 位
- `password`: 必填，长度必须为 8 位

成功响应（201）：

```json
{
  "message": "注册成功",
  "user": {
    "id": 1,
    "username": "demo_user",
    "email": "demo_user@example.com",
    "created_at": "2026-04-08T11:30:00.000Z"
  }
}
```

失败响应：

- `400`: 参数校验失败
- `409`: 用户名已存在
- `409`: 邮箱已存在

## 2. 用户登录

- 方法：`POST`
- 路径：`/api/login`

请求体：

```json
{
  "username": "demo_user",
  "password": "12345678"
}
```

成功响应（200）：

```json
{
  "message": "登录成功",
  "token": "JWT_TOKEN",
  "user": {
    "id": 1,
    "username": "demo_user",
    "email": "demo_user@example.com",
    "created_at": "2026-04-08T11:30:00.000Z"
  }
}
```

说明：

- 同时在响应中设置 `HttpOnly` Cookie：`token`
- 你可以用 `token` 作为 `Authorization: Bearer <token>` 调用受保护接口

失败响应：

- `400`: 参数校验失败
- `401`: 用户名或密码错误

## 3. 获取当前登录用户

- 方法：`GET`
- 路径：`/api/me`

认证方式（二选一）：

- Header: `Authorization: Bearer <token>`
- Cookie: `token=<jwt>`

成功响应（200）：

```json
{
  "user": {
    "id": 1,
    "username": "demo_user",
    "email": "demo_user@example.com",
    "created_at": "2026-04-08T11:30:00.000Z"
  }
}
```

失败响应：

- `401`: 未登录、认证失败或凭证过期
- `404`: 用户不存在

## 4. 创建象棋房间

- 方法：`POST`
- 路径：`/api/game/rooms`
- 鉴权：必需（Bearer 或 Cookie）

请求体：

```json
{
  "side": "red"
}
```

说明：

- `side` 可选：`red` / `black`

成功响应（201）：

```json
{
  "message": "房间创建成功",
  "room": {
    "roomCode": "A7K9Q2",
    "status": "waiting",
    "hostUserId": 1,
    "redUserId": 1,
    "blackUserId": null,
    "gameState": {
      "turn": "red",
      "status": "ongoing"
    }
  }
}
```

## 5. 加入象棋房间

- 方法：`POST`
- 路径：`/api/game/rooms/:roomCode/join`
- 鉴权：必需

成功响应（200）：

```json
{
  "message": "加入房间成功",
  "room": {
    "roomCode": "A7K9Q2",
    "status": "playing"
  }
}
```

失败响应：

- `404`: 房间不存在
- `409`: 房间已满或已开局无法加入

## 6. 获取房间快照

- 方法：`GET`
- 路径：`/api/game/rooms/:roomCode`
- 鉴权：必需

成功响应：返回房间完整快照（棋盘、回合、聊天、玩家状态）。

## 7. 获取用户对局档案

- 方法：`GET`
- 路径：`/api/game/profile`
- 鉴权：必需

成功响应（200）：

```json
{
  "stats": {
    "user_id": 1,
    "wins": 10,
    "losses": 3,
    "draws": 2,
    "points": 1080
  },
  "history": []
}
```

## 8. WebSocket 实时接口

- 地址：`ws://localhost:3000/ws/game`
- 鉴权：`token`（query/header/cookie 任一）
- 消息格式：`{ "type": "...", "payload": {...} }`

客户端 -> 服务端：

- `join_room`：加入房间并订阅房间广播
- `sync_state`：同步房间状态
- `move`：提交走子
- `chat`：发送聊天
- `ping`：心跳

服务端 -> 客户端：

- `connected`
- `room_sync`
- `move_applied`
- `chat`
- `presence`
- `game_over`
- `error`
