"use strict";

const { WebSocketServer } = require("ws");
const { verifyAccessToken } = require("../services/authService");
const { findById } = require("../models/userModel");
const { updatePresence } = require("../models/gameModel");
const {
  SIDES,
  appendChat,
  forceFinishRoom,
  getRoomSnapshot,
  getRoomStore,
  getUserSide,
  joinRoom,
  makeMove,
  markOnline,
  recoverRoom,
  sanitizeRoomCode,
} = require("../services/roomService");

const userConnections = new Map();
const roomConnections = new Map();

function parseCookies(rawCookie) {
  const cookies = {};
  if (!rawCookie) {
    return cookies;
  }
  const parts = rawCookie.split(";");
  parts.forEach((part) => {
    const [name, ...rest] = part.trim().split("=");
    if (!name) {
      return;
    }
    cookies[name] = decodeURIComponent(rest.join("="));
  });
  return cookies;
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }
  const query = new URL(req.url, "http://localhost").searchParams;
  if (query.get("token")) {
    return query.get("token");
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies.token || null;
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToRoom(roomCode, payload) {
  const roomSet = roomConnections.get(roomCode);
  if (!roomSet) {
    return;
  }
  roomSet.forEach((ws) => {
    send(ws, payload);
  });
}

async function attachUserConnection(userId, ws) {
  const current = userConnections.get(userId) || new Set();
  current.add(ws);
  userConnections.set(userId, current);
  await updatePresence(userId, true, current.size);
}

async function detachUserConnection(userId, ws) {
  const current = userConnections.get(userId);
  if (!current) {
    return;
  }
  current.delete(ws);
  if (current.size === 0) {
    userConnections.delete(userId);
    await updatePresence(userId, false, 0);
    return;
  }
  await updatePresence(userId, true, current.size);
}

function attachRoomConnection(roomCode, ws) {
  const code = sanitizeRoomCode(roomCode);
  const roomSet = roomConnections.get(code) || new Set();
  roomSet.add(ws);
  roomConnections.set(code, roomSet);
  ws.roomCode = code;
}

function detachRoomConnection(ws) {
  const code = ws.roomCode;
  if (!code) {
    return;
  }
  const roomSet = roomConnections.get(code);
  if (!roomSet) {
    return;
  }
  roomSet.delete(ws);
  if (roomSet.size === 0) {
    roomConnections.delete(code);
  }
}

async function syncRoom(ws, roomCode) {
  await recoverRoom(roomCode);
  const room = await getRoomSnapshot(roomCode);
  send(ws, {
    type: "room_sync",
    payload: room,
  });
}

function startTurnTimeoutLoop() {
  return setInterval(async () => {
    const now = Date.now();
    const rooms = getRoomStore();
    for (const room of rooms.values()) {
      if (room.status !== "playing") {
        continue;
      }
      const deadline = new Date(room.gameState.turnEndsAt).getTime();
      if (Number.isNaN(deadline) || now <= deadline) {
        continue;
      }
      const loserSide = room.gameState.turn;
      const winnerSide = loserSide === SIDES.RED ? SIDES.BLACK : SIDES.RED;
      await forceFinishRoom({
        roomCode: room.roomCode,
        winnerSide,
        reason: "timeout",
      });
      const snapshot = await getRoomSnapshot(room.roomCode);
      broadcastToRoom(room.roomCode, {
        type: "game_over",
        payload: {
          reason: "timeout",
          winnerSide,
          room: snapshot,
        },
      });
    }
  }, 1000);
}

function initGameSocket(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws/game",
    maxPayload: 1024 * 16,
  });
  const timer = startTurnTimeoutLoop();

  wss.on("connection", async (ws, req) => {
    try {
      const token = getTokenFromRequest(req);
      const payload = verifyAccessToken(token);
      const user = await findById(payload.sub);
      if (!user) {
        ws.close(1008, "unauthorized");
        return;
      }
      ws.user = user;
      await attachUserConnection(user.id, ws);
      send(ws, { type: "connected", payload: { userId: user.id, username: user.username } });

      ws.on("message", async (raw) => {
        try {
          const data = JSON.parse(String(raw || "{}"));
          if (!data || typeof data !== "object") {
            return;
          }
          if (data.type === "ping") {
            send(ws, { type: "pong", payload: { at: new Date().toISOString() } });
            return;
          }

          if (data.type === "join_room") {
            const roomCode = sanitizeRoomCode(data.payload && data.payload.roomCode);
            await joinRoom({ roomCode, user: ws.user });
            attachRoomConnection(roomCode, ws);
            markOnline(roomCode, ws.user.id, true);
            await syncRoom(ws, roomCode);
            broadcastToRoom(roomCode, {
              type: "presence",
              payload: { roomCode, userId: ws.user.id, online: true },
            });
            return;
          }

          if (data.type === "sync_state") {
            const roomCode = sanitizeRoomCode(data.payload && data.payload.roomCode);
            attachRoomConnection(roomCode, ws);
            await syncRoom(ws, roomCode);
            return;
          }

          if (data.type === "move") {
            const roomCode = sanitizeRoomCode(data.payload && data.payload.roomCode);
            const move = data.payload && data.payload.move;
            const timestamp = data.payload && data.payload.timestamp;
            const result = await makeMove({
              roomCode,
              user: ws.user,
              move,
              timestamp,
            });
            broadcastToRoom(roomCode, {
              type: "move_applied",
              payload: {
                move: result.moveRecord,
                room: result.room,
                events: result.events,
              },
            });
            if (result.room.status === "finished") {
              broadcastToRoom(roomCode, {
                type: "game_over",
                payload: {
                  reason: "checkmate_or_capture",
                  winnerSide: result.room.gameState.winner,
                  room: result.room,
                },
              });
            }
            return;
          }

          if (data.type === "chat") {
            const roomCode = sanitizeRoomCode(data.payload && data.payload.roomCode);
            const message = data.payload && data.payload.message;
            const chat = await appendChat({
              roomCode,
              user: ws.user,
              message,
            });
            broadcastToRoom(roomCode, {
              type: "chat",
              payload: chat,
            });
            return;
          }
        } catch (error) {
          send(ws, {
            type: "error",
            payload: { message: error.message || "消息处理失败" },
          });
        }
      });

      ws.on("close", async () => {
        detachRoomConnection(ws);
        await detachUserConnection(ws.user.id, ws);
        if (ws.roomCode) {
          markOnline(ws.roomCode, ws.user.id, false);
          broadcastToRoom(ws.roomCode, {
            type: "presence",
            payload: {
              roomCode: ws.roomCode,
              userId: ws.user.id,
              online: false,
            },
          });
        }
      });
    } catch (error) {
      ws.close(1008, "unauthorized");
    }
  });

  return {
    close: () => {
      clearInterval(timer);
      wss.close();
    },
  };
}

module.exports = {
  initGameSocket,
};
