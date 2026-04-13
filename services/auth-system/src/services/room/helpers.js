"use strict";

function now() {
  return new Date().toISOString();
}

function safeText(input, maxLength = 200) {
  if (!input) {
    return "";
  }
  return String(input).replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function sanitizeRoomCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function buildPublicRoom(room, maxChatHistory = 100) {
  return {
    roomCode: room.roomCode,
    status: room.status,
    hostUserId: room.hostUserId,
    redUserId: room.redUserId,
    blackUserId: room.blackUserId,
    players: {
      red: room.players.red,
      black: room.players.black,
    },
    gameState: room.gameState,
    chat: room.chat.slice(-maxChatHistory),
    updatedAt: room.updatedAt,
    createdAt: room.createdAt,
  };
}

function getUserSide(room, userId, SIDES) {
  if (room.redUserId === userId) {
    return SIDES.RED;
  }
  if (room.blackUserId === userId) {
    return SIDES.BLACK;
  }
  return null;
}

function buildRoomFromDbRow(row) {
  return {
    roomCode: row.room_code,
    hostUserId: row.host_user_id,
    redUserId: row.red_user_id,
    blackUserId: row.black_user_id,
    players: {
      red: row.red_user_id ? { userId: row.red_user_id, username: "红方", online: false } : null,
      black: row.black_user_id
        ? { userId: row.black_user_id, username: "黑方", online: false }
        : null,
    },
    status: row.status,
    gameState: row.game_state,
    chat: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    endedAt: row.ended_at || null,
  };
}

module.exports = {
  now,
  safeText,
  sanitizeRoomCode,
  buildPublicRoom,
  getUserSide,
  buildRoomFromDbRow,
};
