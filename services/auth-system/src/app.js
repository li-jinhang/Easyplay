const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const path = require("path");
const {
  ENABLE_ACCESS_LOG,
  ENABLE_FRONTEND,
  FRONTEND_ROOT,
  RATE_LIMIT_CLEANUP_INTERVAL_MS,
  RATE_LIMIT_MAX_BUCKETS,
  TRUST_PROXY,
} = require("./config");
const { accessLogger } = require("./middleware/accessLogger");
const { corsMiddleware } = require("./middleware/cors");
const { createHotReloadManager, registerFrontend } = require("./frontendServer");
const authRoutes = require("./routes/authRoutes");
const gameRoutes = require("./routes/gameRoutes");
const { createRateLimiter } = require("./middleware/rateLimit");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
const hotReloadManager = createHotReloadManager();

if (TRUST_PROXY) {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json());
app.use(cookieParser());
if (ENABLE_ACCESS_LOG) {
  app.use(accessLogger);
}

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

const apiRouter = express.Router();
apiRouter.use(
  createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 180,
    cleanupIntervalMs: RATE_LIMIT_CLEANUP_INTERVAL_MS,
    maxBuckets: RATE_LIMIT_MAX_BUCKETS,
  })
);
apiRouter.use(authRoutes);
apiRouter.use(gameRoutes);

app.use("/api", apiRouter);

const frontendRootName = path.basename(FRONTEND_ROOT).trim();
if (frontendRootName) {
  app.use(`/${frontendRootName}/api`, apiRouter);
}

if (ENABLE_FRONTEND) {
  registerFrontend(app, hotReloadManager);
}

app.use(errorHandler);

app.locals.hotReloadManager = hotReloadManager;

module.exports = app;
