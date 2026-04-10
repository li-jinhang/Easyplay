const { AppError } = require("../errors");
const { verifyAccessToken } = require("../services/authService");

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AppError(401, "未登录或认证凭证缺失");
    }
    const payload = verifyAccessToken(token);
    req.auth = payload;
    next();
  } catch (error) {
    next(new AppError(401, "认证失败或凭证已过期"));
  }
}

module.exports = {
  requireAuth,
};
