function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "服务器内部错误";

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({
    error: message,
  });
}

module.exports = {
  errorHandler,
};
