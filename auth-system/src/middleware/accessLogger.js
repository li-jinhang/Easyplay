function accessLogger(req, res, next) {
  const startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    const message = [
      `[${new Date().toISOString()}]`,
      req.ip,
      `"${req.method} ${req.originalUrl} HTTP/${req.httpVersion}"`,
      res.statusCode,
      `${elapsedMs.toFixed(2)}ms`,
    ].join(" ");
    // eslint-disable-next-line no-console
    console.log(message);
  });

  next();
}

module.exports = {
  accessLogger,
};
