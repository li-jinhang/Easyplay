"use strict";const{all:w,get:c,run:_}=require("../db");async function l({roomCode:t,hostUserId:e,redUserId:a,blackUserId:s,status:n,gameState:r,createdAt:u,updatedAt:i,endedAt:o=null}){return await c("SELECT id FROM rooms WHERE room_code = ?",[t])?(await _(`UPDATE rooms
       SET host_user_id = ?, red_user_id = ?, black_user_id = ?, status = ?,
           game_state_json = ?, updated_at = ?, ended_at = ?
       WHERE room_code = ?`,[e,a,s,n,JSON.stringify(r),i,o,t]),E(t)):(await _(`INSERT INTO rooms (
      room_code, host_user_id, red_user_id, black_user_id, status, game_state_json, created_at, updated_at, ended_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,[t,e,a,s,n,JSON.stringify(r),u,i,o]),E(t))}async function E(t){const e=await c(`SELECT room_code, host_user_id, red_user_id, black_user_id, status, game_state_json, created_at, updated_at, ended_at
     FROM rooms
     WHERE room_code = ?`,[t]);return e?{...e,game_state:JSON.parse(e.game_state_json)}:null}async function O(){return(await w(`SELECT room_code, host_user_id, red_user_id, black_user_id, status, game_state_json, created_at, updated_at, ended_at
     FROM rooms
     WHERE status IN ('waiting', 'playing')
     ORDER BY updated_at DESC`)).map(e=>({...e,game_state:JSON.parse(e.game_state_json)}))}async function T({roomCode:t,redUserId:e,blackUserId:a,winnerUserId:s,winnerSide:n,result:r,moves:u,startedAt:i,endedAt:o}){const S=new Date().toISOString();await _(`INSERT INTO game_records (
      room_code, red_user_id, black_user_id, winner_user_id, winner_side, result,
      moves_json, started_at, ended_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,[t,e,a,s,n,r,JSON.stringify(u),i,o,S])}async function g(t,e=20){return w(`SELECT id, room_code, red_user_id, black_user_id, winner_user_id, winner_side, result, started_at, ended_at, created_at
     FROM game_records
     WHERE red_user_id = ? OR black_user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,[t,t,e])}async function d(t){const e=new Date().toISOString();return await _(`INSERT OR IGNORE INTO user_stats (user_id, wins, losses, draws, points, updated_at)
     VALUES (?, 0, 0, 0, 1000, ?)`,[t,e]),R(t)}async function R(t){return c(`SELECT user_id, wins, losses, draws, points, updated_at
     FROM user_stats
     WHERE user_id = ?`,[t])}async function m({winnerUserId:t,loserUserId:e,drawUserIds:a=[]}){const s=new Date().toISOString();if(t&&e&&(await d(t),await d(e),await _("UPDATE user_stats SET wins = wins + 1, points = points + 10, updated_at = ? WHERE user_id = ?",[s,t]),await _("UPDATE user_stats SET losses = losses + 1, points = CASE WHEN points > 10 THEN points - 10 ELSE 0 END, updated_at = ? WHERE user_id = ?",[s,e])),a.length>0)for(const n of a)await d(n),await _("UPDATE user_stats SET draws = draws + 1, updated_at = ? WHERE user_id = ?",[s,n])}async function p(t,e,a){const s=new Date().toISOString();await _(`INSERT INTO presence (user_id, online, last_seen_at, socket_count)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET online = excluded.online, last_seen_at = excluded.last_seen_at, socket_count = excluded.socket_count`,[t,e?1:0,s,a])}module.exports={createOrUpdateRoom:l,getRoomByCode:E,listActiveRooms:O,createGameRecord:T,getUserGameHistory:g,ensureUserStats:d,getUserStats:R,updateStatsForResult:m,updatePresence:p};
