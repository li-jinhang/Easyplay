"use strict";

const buckets = new Map();

function getClientKey(req) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const auth = req.auth ? `u:${req.auth.sub}` : "guest";
  return `${auth}|${ip}`;
}

function createRateLimiter({ windowMs, maxRequests }) {
  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const key = getClientKey(req);
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > maxRequests) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      res.status(429).json({ error: "请求过于频繁，请稍后再试" });
      return;
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
};
