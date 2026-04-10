module.exports = {
  testEnvironment: "node",
  collectCoverageFrom: [
    "services/auth-system/src/**/*.js",
    "!services/auth-system/src/server.js",
  ],
};
