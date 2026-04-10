const express = require("express");
const { body, validationResult } = require("express-validator");
const { AppError } = require("../errors");
const {
  createUser,
  findByEmail,
  findById,
  findByUsername,
} = require("../models/userModel");
const { requireAuth } = require("../middleware/auth");
const {
  comparePassword,
  hashPassword,
  signAccessToken,
} = require("../services/authService");

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

const loginValidationRules = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("用户名不能为空")
    .isLength({ min: 3, max: 32 })
    .withMessage("用户名长度需在3到32之间")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("用户名仅支持字母、数字、下划线"),
  body("password")
    .isString()
    .withMessage("密码必须为字符串")
    .isLength({ min: 8, max: 8 })
    .withMessage("密码长度必须为8位"),
];

const registerValidationRules = [
  ...loginValidationRules,
  body("email")
    .trim()
    .notEmpty()
    .withMessage("邮箱不能为空")
    .isEmail()
    .withMessage("邮箱格式不正确")
    .isLength({ max: 128 })
    .withMessage("邮箱长度不能超过128位")
    .normalizeEmail(),
];

router.post(
  "/register",
  validate(registerValidationRules),
  asyncHandler(async (req, res) => {
    const username = req.body.username.trim();
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    const existingByUsername = await findByUsername(username);
    if (existingByUsername) {
      throw new AppError(409, "用户名已存在");
    }
    const existingByEmail = await findByEmail(email);
    if (existingByEmail) {
      throw new AppError(409, "邮箱已存在");
    }

    const passwordHash = await hashPassword(password);
    const createdAt = new Date().toISOString();
    const user = await createUser({
      username,
      email,
      passwordHash,
      createdAt,
    });

    res.status(201).json({
      message: "注册成功",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      },
    });
  })
);

router.post(
  "/login",
  validate(loginValidationRules),
  asyncHandler(async (req, res) => {
    const username = req.body.username.trim();
    const password = req.body.password;
    const user = await findByUsername(username);

    if (!user) {
      throw new AppError(401, "用户名或密码错误");
    }

    const matched = await comparePassword(password, user.password_hash);
    if (!matched) {
      throw new AppError(401, "用户名或密码错误");
    }

    const token = signAccessToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 2 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "登录成功",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      },
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await findById(req.auth.sub);
    if (!user) {
      throw new AppError(404, "用户不存在");
    }
    res.status(200).json({ user });
  })
);

module.exports = router;
