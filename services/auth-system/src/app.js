const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { ENABLE_ACCESS_LOG, ENABLE_FRONTEND, TRUST_PROXY } = require("./config");
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

app.use(
  "/api",
  createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 180,
  })
);
app.use("/api", authRoutes);
app.use("/api", gameRoutes);

if (ENABLE_FRONTEND) {
  registerFrontend(app, hotReloadManager);
}

app.use(errorHandler);

app.locals.hotReloadManager = hotReloadManager;

module.exports = app;
