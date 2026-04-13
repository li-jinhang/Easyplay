"use strict";

const gameRoutes = require("../../routes/gameRoutes");
const { hydrateRoomsFromDatabase } = require("../../services/roomService");
const { initGameSocket } = require("../../websocket/gameSocket");

function registerGameApi(apiRouter) {
  apiRouter.use(gameRoutes);
}

async function bootstrapGameDomain() {
  await hydrateRoomsFromDatabase();
}

function attachGameRealtime(server) {
  const socketManager = initGameSocket(server);
  return {
    close: () => socketManager.close(),
  };
}

module.exports = {
  registerGameApi,
  bootstrapGameDomain,
  attachGameRealtime,
};
