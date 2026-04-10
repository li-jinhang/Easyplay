"use strict";

const { all, get, run } = require("../db");

async function createOrUpdateRoom({
  roomCode,
  hostUserId,
  redUserId,
  blackUserId,
  status,
  gameState,
  createdAt,
  updatedAt,
  endedAt = null,
}) {
  const existing = await get(`SELECT id FROM rooms WHERE room_code = ?`, [roomCode]);
  if (existing) {
    await run(
      `UPDATE rooms
       SET host_user_id = ?, red_user_id = ?, black_user_id = ?, status = ?,
           game_state_json = ?, updated_at = ?, ended_at = ?
       WHERE room_code = ?`,
      [
        hostUserId,
        redUserId,
        blackUserId,
        status,
        JSON.stringify(gameState),
        updatedAt,
        endedAt,
        roomCode,
      ]
    );
    return getRoomByCode(roomCode);
  }

  await run(
    `INSERT INTO rooms (
      room_code, host_user_id, red_user_id, black_user_id, status, game_state_json, created_at, updated_at, ended_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      roomCode,
      hostUserId,
      redUserId,
      blackUserId,
      status,
      JSON.stringify(gameState),
      createdAt,
      updatedAt,
      endedAt,
    ]
  );
  return getRoomByCode(roomCode);
}

async function getRoomByCode(roomCode) {
  const row = await get(
    `SELECT room_code, host_user_id, red_user_id, black_user_id, status, game_state_json, created_at, updated_at, ended_at
     FROM rooms
     WHERE room_code = ?`,
    [roomCode]
  );
  if (!row) {
    return null;
  }
  return {
    ...row,
    game_state: JSON.parse(row.game_state_json),
  };
}

async function listActiveRooms() {
  const rows = await all(
    `SELECT room_code, host_user_id, red_user_id, black_user_id, status, game_state_json, created_at, updated_at, ended_at
     FROM rooms
     WHERE status IN ('waiting', 'playing')
     ORDER BY updated_at DESC`
  );
  return rows.map((row) => ({
    ...row,
    game_state: JSON.parse(row.game_state_json),
  }));
}

async function createGameRecord({
  roomCode,
  redUserId,
  blackUserId,
  winnerUserId,
  winnerSide,
  result,
  moves,
  startedAt,
  endedAt,
}) {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO game_records (
      room_code, red_user_id, black_user_id, winner_user_id, winner_side, result,
      moves_json, started_at, ended_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      roomCode,
      redUserId,
      blackUserId,
      winnerUserId,
      winnerSide,
      result,
      JSON.stringify(moves),
      startedAt,
      endedAt,
      now,
    ]
  );
}

async function getUserGameHistory(userId, limit = 20) {
  return all(
    `SELECT id, room_code, red_user_id, black_user_id, winner_user_id, winner_side, result, started_at, ended_at, created_at
     FROM game_records
     WHERE red_user_id = ? OR black_user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, userId, limit]
  );
}

async function ensureUserStats(userId) {
  const now = new Date().toISOString();
  await run(
    `INSERT OR IGNORE INTO user_stats (user_id, wins, losses, draws, points, updated_at)
     VALUES (?, 0, 0, 0, 1000, ?)`,
    [userId, now]
  );
  return getUserStats(userId);
}

async function getUserStats(userId) {
  return get(
    `SELECT user_id, wins, losses, draws, points, updated_at
     FROM user_stats
     WHERE user_id = ?`,
    [userId]
  );
}

async function updateStatsForResult({ winnerUserId, loserUserId, drawUserIds = [] }) {
  const now = new Date().toISOString();
  if (winnerUserId && loserUserId) {
    await ensureUserStats(winnerUserId);
    await ensureUserStats(loserUserId);
    await run(
      `UPDATE user_stats SET wins = wins + 1, points = points + 10, updated_at = ? WHERE user_id = ?`,
      [now, winnerUserId]
    );
    await run(
      `UPDATE user_stats SET losses = losses + 1, points = CASE WHEN points > 10 THEN points - 10 ELSE 0 END, updated_at = ? WHERE user_id = ?`,
      [now, loserUserId]
    );
  }

  if (drawUserIds.length > 0) {
    for (const userId of drawUserIds) {
      await ensureUserStats(userId);
      await run(
        `UPDATE user_stats SET draws = draws + 1, updated_at = ? WHERE user_id = ?`,
        [now, userId]
      );
    }
  }
}

async function updatePresence(userId, online, socketCount) {
  const now = new Date().toISOString();
  await run(
    `INSERT INTO presence (user_id, online, last_seen_at, socket_count)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET online = excluded.online, last_seen_at = excluded.last_seen_at, socket_count = excluded.socket_count`,
    [userId, online ? 1 : 0, now, socketCount]
  );
}

module.exports = {
  createOrUpdateRoom,
  getRoomByCode,
  listActiveRooms,
  createGameRecord,
  getUserGameHistory,
  ensureUserStats,
  getUserStats,
  updateStatsForResult,
  updatePresence,
};
