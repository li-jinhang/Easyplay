const authRoutes = require("../../routes/authRoutes");

function registerAuthApi(apiRouter) {
  apiRouter.use(authRoutes);
}

module.exports = {
  registerAuthApi,
};
