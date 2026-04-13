"use strict";

const crypto = require("crypto");
const { AppError } = require("../errors");
const { MAX_CHAT_HISTORY, ROOM_CODE_CHARS, ROOM_STATUS } = require("./room/constants");
const {
  buildPublicRoom,
  buildRoomFromDbRow,
  getUserSide,
  now,
  safeText,
  sanitizeRoomCode,
} = require("./room/helpers");
const {
  GAME_STATUS,
  SIDES,
  applyMove,
  createInitialGameState,
} = require("./chessEngine");
const {
  createGameRecord,
  createOrUpdateRoom,
  ensureUserStats,
  getRoomByCode,
  listActiveRooms,
  getUserGameHistory,
  getUserStats,
  updateStatsForResult,
} = require("../models/gameModel");

const roomStore = new Map();

function generateRoomCode(length = 6) {
  const size = Math.max(6, Math.min(8, length));
  let code = "";
  const bytes = crypto.randomBytes(size);
  for (let i = 0; i < size; i += 1) {
    code += ROOM_CODE_CHARS[bytes[i] % ROOM_CODE_CHARS.length];
  }
  return code;
}

async function generateUniqueRoomCode() {
  for (let i = 0; i < 12; i += 1) {
    const candidate = generateRoomCode(6 + Math.floor(Math.random() * 3));
    if (roomStore.has(candidate)) {
      continue;
    }
    const existing = await getRoomByCode(candidate);
    if (!existing) {
      return candidate;
    }
  }
  throw new AppError(500, "房间号生成失败，请重试");
}

async function persistRoom(room) {
  await createOrUpdateRoom({
    roomCode: room.roomCode,
    hostUserId: room.hostUserId,
    redUserId: room.redUserId,
    blackUserId: room.blackUserId,
    status: room.status,
    gameState: room.gameState,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    endedAt: room.endedAt || null,
  });
}

async function createRoom({ user, preferredSide }) {
  const side = preferredSide === SIDES.BLACK ? SIDES.BLACK : SIDES.RED;
  const roomCode = await generateUniqueRoomCode();
  const state = createInitialGameState();
  const createdAt = now();
  const room = {
    roomCode,
    hostUserId: user.id,
    redUserId: side === SIDES.RED ? user.id : null,
    blackUserId: side === SIDES.BLACK ? user.id : null,
    players: {
      red:
        side === SIDES.RED
          ? { userId: user.id, username: user.username, online: true }
          : null,
      black:
        side === SIDES.BLACK
          ? { userId: user.id, username: user.username, online: true }
          : null,
    },
    status: ROOM_STATUS.WAITING,
    gameState: state,
    chat: [],
    createdAt,
    updatedAt: createdAt,
    endedAt: null,
  };
  roomStore.set(roomCode, room);
  await ensureUserStats(user.id);
  await persistRoom(room);
  return buildPublicRoom(room, MAX_CHAT_HISTORY);
}

function getRoomOrThrow(code) {
  const roomCode = sanitizeRoomCode(code);
  const room = roomStore.get(roomCode);
  if (!room) {
    throw new AppError(404, "房间不存在");
  }
  return room;
}

async function joinRoom({ roomCode, user }) {
  const room = getRoomOrThrow(roomCode);
  const side = getUserSide(room, user.id, SIDES);
  if (side) {
    room.players[side] = { userId: user.id, username: user.username, online: true };
    room.updatedAt = now();
    await persistRoom(room);
    return buildPublicRoom(room, MAX_CHAT_HISTORY);
  }
  if (room.status !== ROOM_STATUS.WAITING) {
    throw new AppError(409, "房间已开局，无法加入");
  }
  if (room.redUserId && room.blackUserId) {
    throw new AppError(409, "房间已满");
  }
  const assigned = room.redUserId ? SIDES.BLACK : SIDES.RED;
  room[`${assigned}UserId`] = user.id;
  room.players[assigned] = { userId: user.id, username: user.username, online: true };
  room.status = ROOM_STATUS.PLAYING;
  room.updatedAt = now();
  await ensureUserStats(user.id);
  await persistRoom(room);
  return buildPublicRoom(room, MAX_CHAT_HISTORY);
}

async function makeMove({ roomCode, user, move, timestamp }) {
  const room = getRoomOrThrow(roomCode);
  if (room.status !== ROOM_STATUS.PLAYING) {
    throw new AppError(409, "房间当前不在游戏中");
  }
  const side = getUserSide(room, user.id, SIDES);
  if (!side) {
    throw new AppError(403, "你不是该房间玩家");
  }
  if (room.gameState.turn !== side) {
    throw new AppError(409, "未到你的回合");
  }

  const result = applyMove(room.gameState, move, {
    userId: user.id,
    username: user.username,
    timestamp,
  });
  if (!result.ok) {
    throw new AppError(400, result.error);
  }

  room.gameState = result.state;
  room.updatedAt = now();
  if (result.state.status === GAME_STATUS.ENDED) {
    room.status = ROOM_STATUS.FINISHED;
    room.endedAt = room.updatedAt;
    await finalizeRoomGame(room);
  }
  await persistRoom(room);

  return {
    room: buildPublicRoom(room, MAX_CHAT_HISTORY),
    moveRecord: result.moveRecord,
    events: result.events,
  };
}

async function finalizeRoomGame(room) {
  const winnerSide = room.gameState.winner;
  const winnerUserId = winnerSide ? room[`${winnerSide}UserId`] : null;
  const loserSide = winnerSide === SIDES.RED ? SIDES.BLACK : SIDES.RED;
  const loserUserId = winnerSide ? room[`${loserSide}UserId`] : null;
  const result = winnerSide ? `${winnerSide}_win` : "draw";

  await createGameRecord({
    roomCode: room.roomCode,
    redUserId: room.redUserId,
    blackUserId: room.blackUserId,
    winnerUserId,
    winnerSide,
    result,
    moves: room.gameState.history,
    startedAt: room.gameState.startedAt,
    endedAt: room.endedAt || now(),
  });

  if (winnerUserId && loserUserId) {
    await updateStatsForResult({ winnerUserId, loserUserId });
  } else {
    const drawUserIds = [room.redUserId, room.blackUserId].filter(Boolean);
    await updateStatsForResult({ winnerUserId: null, loserUserId: null, drawUserIds });
  }
}

async function forceFinishRoom({ roomCode, winnerSide, reason }) {
  const room = getRoomOrThrow(roomCode);
  if (room.status === ROOM_STATUS.FINISHED) {
    return buildPublicRoom(room, MAX_CHAT_HISTORY);
  }
  room.gameState.status = GAME_STATUS.ENDED;
  room.gameState.winner = winnerSide;
  room.gameState.updatedAt = now();
  room.gameState.lastMove = {
    fromX: -1,
    fromY: -1,
    toX: -1,
    toY: -1,
    pieceId: "system",
    pieceType: "system",
    pieceSide: winnerSide,
    captured: null,
    actorUserId: null,
    actorUsername: "system",
    timestamp: room.gameState.updatedAt,
    reason: reason || "forced_finish",
  };
  room.gameState.history.push(room.gameState.lastMove);
  room.status = ROOM_STATUS.FINISHED;
  room.updatedAt = room.gameState.updatedAt;
  room.endedAt = room.gameState.updatedAt;
  await finalizeRoomGame(room);
  await persistRoom(room);
  return buildPublicRoom(room, MAX_CHAT_HISTORY);
}

async function appendChat({ roomCode, user, message }) {
  const room = getRoomOrThrow(roomCode);
  const clean = safeText(message, 300);
  if (!clean) {
    throw new AppError(400, "聊天内容不能为空");
  }
  const chatEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: user.id,
    username: user.username,
    text: clean,
    timestamp: now(),
  };
  room.chat.push(chatEntry);
  if (room.chat.length > MAX_CHAT_HISTORY) {
    room.chat = room.chat.slice(-MAX_CHAT_HISTORY);
  }
  room.updatedAt = now();
  await persistRoom(room);
  return chatEntry;
}

async function getRoomSnapshot(roomCode) {
  const room = getRoomOrThrow(roomCode);
  return buildPublicRoom(room, MAX_CHAT_HISTORY);
}

function markOnline(roomCode, userId, online) {
  const room = roomStore.get(sanitizeRoomCode(roomCode));
  if (!room) {
    return;
  }
  const side = getUserSide(room, userId, SIDES);
  if (!side || !room.players[side]) {
    return;
  }
  room.players[side].online = online;
  room.updatedAt = now();
}

async function hydrateRoomsFromDatabase() {
  // 仅恢复未结束房间到内存，支持异常重启后的断线重连。
  const rows = await listActiveRooms();
  rows.forEach((row) => {
    upsertRoomFromDbRow(row);
  });
}

async function getUserProfile(userId) {
  const [stats, history] = await Promise.all([
    ensureUserStats(userId),
    getUserGameHistory(userId, 20),
  ]);
  return {
    stats,
    history,
  };
}

function upsertRoomFromDbRow(row) {
  if (!row) {
    return;
  }
  const room = buildRoomFromDbRow(row);
  roomStore.set(room.roomCode, room);
}

async function recoverRoom(roomCode) {
  const normalized = sanitizeRoomCode(roomCode);
  if (roomStore.has(normalized)) {
    return buildPublicRoom(roomStore.get(normalized), MAX_CHAT_HISTORY);
  }
  const row = await getRoomByCode(normalized);
  if (!row) {
    throw new AppError(404, "房间不存在");
  }
  upsertRoomFromDbRow(row);
  return buildPublicRoom(roomStore.get(normalized), MAX_CHAT_HISTORY);
}

function getRoomStore() {
  return roomStore;
}

module.exports = {
  ROOM_STATUS,
  createRoom,
  joinRoom,
  makeMove,
  forceFinishRoom,
  appendChat,
  getRoomSnapshot,
  markOnline,
  recoverRoom,
  getUserProfile,
  getRoomStore,
  sanitizeRoomCode,
  getUserSide,
  hydrateRoomsFromDatabase,
  safeText,
  SIDES,
};
