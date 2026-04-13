const { ENABLE_FRONTEND } = require("../../config");
const {
  createHotReloadManager,
  registerFrontend,
} = require("../../frontendServer");

function createStaticHostingModule() {
  const hotReloadManager = createHotReloadManager();

  return {
    register(app) {
      if (ENABLE_FRONTEND) {
        registerFrontend(app, hotReloadManager);
      }
    },
    start() {
      hotReloadManager.startWatch();
    },
    stop() {
      hotReloadManager.stopWatch();
    },
    hotReloadManager,
  };
}

module.exports = {
  createStaticHostingModule,
};
