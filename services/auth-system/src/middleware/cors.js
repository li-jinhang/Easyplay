const { CORS_CREDENTIALS, CORS_HEADERS, CORS_METHODS, CORS_ORIGIN } = require("../config");

function isOriginAllowed(origin) {
  if (!origin || CORS_ORIGIN === "*") {
    return true;
  }
  const allowList = CORS_ORIGIN.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return allowList.includes(origin);
}

function corsMiddleware(req, res, next) {
  const requestOrigin = req.headers.origin;

  if (isOriginAllowed(requestOrigin)) {
    const outputOrigin =
      CORS_ORIGIN === "*"
        ? CORS_CREDENTIALS && requestOrigin
          ? requestOrigin
          : "*"
        : requestOrigin;
    res.setHeader("Access-Control-Allow-Origin", outputOrigin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", CORS_METHODS);
  res.setHeader("Access-Control-Allow-Headers", CORS_HEADERS);

  if (CORS_CREDENTIALS) {
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  return next();
}

module.exports = {
  corsMiddleware,
};
