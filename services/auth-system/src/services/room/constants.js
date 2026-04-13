"use strict";

const ROOM_STATUS = {
  WAITING: "waiting",
  PLAYING: "playing",
  FINISHED: "finished",
};

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_CHAT_HISTORY = 100;

module.exports = {
  ROOM_STATUS,
  ROOM_CODE_CHARS,
  MAX_CHAT_HISTORY,
};
