"use strict";

const express = require("express");
const { body, param, validationResult } = require("express-validator");
const { AppError } = require("../errors");
const { requireAuth } = require("../middleware/auth");
const { findById } = require("../models/userModel");
const {
  SIDES,
  createRoom,
  getRoomSnapshot,
  getUserProfile,
  joinRoom,
  recoverRoom,
  sanitizeRoomCode,
} = require("../services/roomService");

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function validate(rules) {
  return [
    ...rules,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new AppError(400, errors.array()[0].msg));
      }
      return next();
    },
  ];
}

async function loadCurrentUser(req) {
  const user = await findById(req.auth.sub);
  if (!user) {
    throw new AppError(404, "用户不存在");
  }
  return user;
}

router.post(
  "/game/rooms",
  requireAuth,
  validate([
    body("side")
      .optional()
      .isIn([SIDES.RED, SIDES.BLACK])
      .withMessage("side 仅支持 red 或 black"),
  ]),
  asyncHandler(async (req, res) => {
    const user = await loadCurrentUser(req);
    const room = await createRoom({
      user,
      preferredSide: req.body.side,
    });
    res.status(201).json({
      message: "房间创建成功",
      room,
    });
  })
);

router.post(
  "/game/rooms/:roomCode/join",
  requireAuth,
  validate([
    param("roomCode")
      .trim()
      .isLength({ min: 6, max: 8 })
      .withMessage("房间号长度必须为 6-8 位")
      .matches(/^[A-Z0-9]+$/i)
      .withMessage("房间号格式非法"),
  ]),
  asyncHandler(async (req, res) => {
    const user = await loadCurrentUser(req);
    const roomCode = sanitizeRoomCode(req.params.roomCode);
    await recoverRoom(roomCode);
    const room = await joinRoom({
      roomCode,
      user,
    });
    res.status(200).json({
      message: "加入房间成功",
      room,
    });
  })
);

router.get(
  "/game/rooms/:roomCode",
  requireAuth,
  validate([
    param("roomCode")
      .trim()
      .isLength({ min: 6, max: 8 })
      .withMessage("房间号长度必须为 6-8 位"),
  ]),
  asyncHandler(async (req, res) => {
    const roomCode = sanitizeRoomCode(req.params.roomCode);
    await recoverRoom(roomCode);
    const room = await getRoomSnapshot(roomCode);
    res.status(200).json({ room });
  })
);

router.get(
  "/game/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await getUserProfile(req.auth.sub);
    res.status(200).json(profile);
  })
);

module.exports = router;
