const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.join(process.cwd(), ".env"),
});

function toBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPath(value, fallbackAbsolutePath) {
  if (!value) {
    return fallbackAbsolutePath;
  }
  return path.isAbsolute(value)
    ? value
    : path.resolve(path.join(__dirname, ".."), value);
}

const NODE_ENV = process.env.NODE_ENV || "development";
const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");
const FRONTEND_ROOT = toPath(process.env.FRONTEND_ROOT, PROJECT_ROOT);

const config = {
  NODE_ENV,
  IS_PRODUCTION: NODE_ENV === "production",
  HOST: process.env.HOST || "0.0.0.0",
  PORT: toNumber(process.env.PORT, 3000),
  JWT_SECRET: process.env.JWT_SECRET || "replace-this-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "2h",
  DB_PATH:
    process.env.DB_PATH || path.join(__dirname, "..", "data", "auth.db"),
  BCRYPT_ROUNDS: toNumber(process.env.BCRYPT_ROUNDS, 10),
  TRUST_PROXY: toBoolean(process.env.TRUST_PROXY, false),
  ENABLE_ACCESS_LOG: toBoolean(process.env.ENABLE_ACCESS_LOG, true),
  ENABLE_FRONTEND: toBoolean(process.env.ENABLE_FRONTEND, true),
  FRONTEND_ROOT,
  FRONTEND_ENTRY: process.env.FRONTEND_ENTRY || "index.html",
  DEV_HOT_RELOAD: toBoolean(
    process.env.DEV_HOT_RELOAD,
    NODE_ENV !== "production"
  ),
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  CORS_METHODS:
    process.env.CORS_METHODS ||
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  CORS_HEADERS:
    process.env.CORS_HEADERS ||
    "Origin,X-Requested-With,Content-Type,Accept,Authorization",
  CORS_CREDENTIALS: toBoolean(process.env.CORS_CREDENTIALS, false),
  STATIC_CACHE_MAX_AGE: toNumber(process.env.STATIC_CACHE_MAX_AGE, 31536000),
  HTML_CACHE_MAX_AGE: toNumber(process.env.HTML_CACHE_MAX_AGE, 0),
  ENABLE_HTTPS: toBoolean(process.env.ENABLE_HTTPS, false),
  HTTPS_KEY_PATH: toPath(
    process.env.HTTPS_KEY_PATH,
    path.join(__dirname, "..", "certs", "server.key")
  ),
  HTTPS_CERT_PATH: toPath(
    process.env.HTTPS_CERT_PATH,
    path.join(__dirname, "..", "certs", "server.crt")
  ),
  KEEP_ALIVE_TIMEOUT: toNumber(process.env.KEEP_ALIVE_TIMEOUT, 65000),
  REQUEST_TIMEOUT: toNumber(process.env.REQUEST_TIMEOUT, 30000),
};

config.FRONTEND_ENTRY_PATH = path.join(config.FRONTEND_ROOT, config.FRONTEND_ENTRY);
config.HTTPS_CERT_EXISTS = fs.existsSync(config.HTTPS_CERT_PATH);
config.HTTPS_KEY_EXISTS = fs.existsSync(config.HTTPS_KEY_PATH);

module.exports = config;
