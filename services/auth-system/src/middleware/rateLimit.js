"use strict";

const buckets = new Map();

function getClientKey(req) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const auth = req.auth ? `u:${req.auth.sub}` : "guest";
  return `${auth}|${ip}`;
}

function createRateLimiter({
  windowMs,
  maxRequests,
  cleanupIntervalMs = Math.max(windowMs, 30000),
  maxBuckets = 20000,
}) {
  const cleanupInterval = Math.max(cleanupIntervalMs, 1000);
  const bucketLimit = Math.max(maxBuckets, 1000);
  let nextCleanupAt = Date.now() + cleanupInterval;

  function cleanup(now) {
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
    if (buckets.size <= bucketLimit) {
      return;
    }
    const overflow = buckets.size - bucketLimit;
    let removed = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      removed += 1;
      if (removed >= overflow) {
        break;
      }
    }
  }

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    if (now >= nextCleanupAt) {
      cleanup(now);
      nextCleanupAt = now + cleanupInterval;
    }
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
