const fs = require("fs");
const http = require("http");
const https = require("https");
const app = require("./app");
const {
  ENABLE_HTTPS,
  HOST,
  HTTPS_CERT_EXISTS,
  HTTPS_CERT_PATH,
  HTTPS_KEY_EXISTS,
  HTTPS_KEY_PATH,
  KEEP_ALIVE_TIMEOUT,
  PORT,
  REQUEST_TIMEOUT,
} = require("./config");
const { initializeDatabase } = require("./db");
const { hydrateRoomsFromDatabase } = require("./services/roomService");
const { initGameSocket } = require("./websocket/gameSocket");

function createServer() {
  if (!ENABLE_HTTPS) {
    return http.createServer(app);
  }

  if (!HTTPS_CERT_EXISTS || !HTTPS_KEY_EXISTS) {
    throw new Error(
      `HTTPS enabled but cert/key missing: cert=${HTTPS_CERT_PATH}, key=${HTTPS_KEY_PATH}`
    );
  }

  return https.createServer(
    {
      cert: fs.readFileSync(HTTPS_CERT_PATH),
      key: fs.readFileSync(HTTPS_KEY_PATH),
    },
    app
  );
}

async function bootstrap() {
  await initializeDatabase();
  await hydrateRoomsFromDatabase();
  const server = createServer();
  const socketManager = initGameSocket(server);
  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT;
  server.requestTimeout = REQUEST_TIMEOUT;
  server.headersTimeout = REQUEST_TIMEOUT + 1000;

  app.locals.hotReloadManager.startWatch();

  server.listen(PORT, HOST, () => {
    const protocol = ENABLE_HTTPS ? "https" : "http";
    // eslint-disable-next-line no-console
    console.log(`Server running at ${protocol}://${HOST}:${PORT}`);
  });

  const shutdown = () => {
    app.locals.hotReloadManager.stopWatch();
    socketManager.close();
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", error);
  process.exit(1);
});
