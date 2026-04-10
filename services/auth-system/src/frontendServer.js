const fs = require("fs");
const path = require("path");
const {
  DEV_HOT_RELOAD,
  FRONTEND_ENTRY_PATH,
  FRONTEND_ROOT,
  HTML_CACHE_MAX_AGE,
  IS_PRODUCTION,
  STATIC_CACHE_MAX_AGE,
} = require("./config");

const HOT_RELOAD_SCRIPT = `
<script>
  (() => {
    const source = new EventSource("/__hmr");
    source.addEventListener("reload", () => window.location.reload());
  })();
</script>
`;

function hasStaticAssetExt(requestPath) {
  return /\.[a-zA-Z0-9]+$/.test(requestPath);
}

function getSafeAbsolutePath(requestPath) {
  let decodedPath = requestPath;
  try {
    decodedPath = decodeURIComponent(requestPath);
  } catch (error) {
    return null;
  }

  const normalizedPath = path
    .normalize(decodedPath)
    .replace(/^([.]{2}[\\/])+/, "")
    .replace(/^[\\/]+/, "");
  const absolutePath = path.join(FRONTEND_ROOT, normalizedPath);

  if (!absolutePath.startsWith(FRONTEND_ROOT)) {
    return null;
  }

  return absolutePath;
}

function resolveHtmlPathForRequest(requestPath) {
  const absolutePath = getSafeAbsolutePath(requestPath);
  if (!absolutePath) {
    return null;
  }

  if (fs.existsSync(absolutePath)) {
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      const indexFile = path.join(absolutePath, "index.html");
      return fs.existsSync(indexFile) ? indexFile : null;
    }
    return absolutePath.endsWith(".html") ? absolutePath : null;
  }

  if (!path.extname(absolutePath)) {
    const htmlFile = `${absolutePath}.html`;
    return fs.existsSync(htmlFile) ? htmlFile : null;
  }

  return null;
}

function setCacheHeader(res, requestPath, isHtml) {
  if (!IS_PRODUCTION) {
    res.setHeader("Cache-Control", "no-cache");
    return;
  }

  if (isHtml) {
    res.setHeader("Cache-Control", `public, max-age=${HTML_CACHE_MAX_AGE}`);
    return;
  }

  const hashedAsset = /[.-][a-f0-9]{8,}\./i.test(requestPath);
  if (hashedAsset) {
    res.setHeader(
      "Cache-Control",
      `public, max-age=${STATIC_CACHE_MAX_AGE}, immutable`
    );
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=3600");
}

function sendHtmlFile(res, htmlFilePath, injectHotReload) {
  setCacheHeader(res, htmlFilePath, true);
  res.type("html");

  if (!injectHotReload) {
    return res.sendFile(htmlFilePath);
  }

  return fs.promises
    .readFile(htmlFilePath, "utf8")
    .then((content) => {
      const injected = content.includes("</body>")
        ? content.replace("</body>", `${HOT_RELOAD_SCRIPT}</body>`)
        : `${content}${HOT_RELOAD_SCRIPT}`;
      res.status(200).send(injected);
    })
    .catch((error) => {
      res.status(500).json({ error: "读取 HTML 文件失败", details: error.message });
    });
}

function createHotReloadManager() {
  const clients = new Set();
  let watcher = null;

  function sseHandler(req, res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write("event: connected\ndata: ok\n\n");

    clients.add(res);
    req.on("close", () => clients.delete(res));
  }

  function broadcastReload() {
    for (const client of clients) {
      client.write("event: reload\ndata: changed\n\n");
    }
  }

  function startWatch() {
    if (IS_PRODUCTION || !DEV_HOT_RELOAD) {
      return;
    }
    if (!fs.existsSync(FRONTEND_ROOT)) {
      return;
    }

    try {
      watcher = fs.watch(
        FRONTEND_ROOT,
        { recursive: true },
        (eventType, filename) => {
          if (!filename || filename.includes("node_modules")) {
            return;
          }
          if (eventType === "change" || eventType === "rename") {
            broadcastReload();
          }
        }
      );
      // eslint-disable-next-line no-console
      console.log(`[HMR] Watching ${FRONTEND_ROOT}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[HMR] Watch disabled:", error.message);
    }
  }

  function stopWatch() {
    if (watcher) {
      watcher.close();
      watcher = null;
    }
    for (const client of clients) {
      client.end();
    }
    clients.clear();
  }

  return {
    enabled: !IS_PRODUCTION && DEV_HOT_RELOAD,
    sseHandler,
    startWatch,
    stopWatch,
  };
}

function registerFrontend(app, hotReloadManager) {
  if (!fs.existsSync(FRONTEND_ROOT)) {
    // eslint-disable-next-line no-console
    console.warn(`Frontend root not found: ${FRONTEND_ROOT}`);
    return;
  }

  if (hotReloadManager.enabled) {
    app.get("/__hmr", hotReloadManager.sseHandler);
  }

  app.get(/.*/, (req, res, next) => {
    if (!["GET", "HEAD"].includes(req.method) || req.path.startsWith("/api")) {
      return next();
    }

    if (
      req.path !== "/" &&
      !hasStaticAssetExt(req.path) &&
      !req.path.endsWith("/") &&
      req.accepts("html")
    ) {
      const queryIndex = req.originalUrl.indexOf("?");
      const queryString = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : "";
      return res.redirect(308, `${req.path}/${queryString}`);
    }

    const htmlPath = resolveHtmlPathForRequest(req.path);
    if (!htmlPath) {
      return next();
    }

    return sendHtmlFile(res, htmlPath, hotReloadManager.enabled);
  });

  app.use(
    expressStaticWithCache(FRONTEND_ROOT, {
      setHeaders: (res, filePath) => {
        const requestPath = path.relative(FRONTEND_ROOT, filePath);
        setCacheHeader(res, requestPath, false);
      },
    })
  );

  app.get(/.*/, (req, res, next) => {
    if (!req.path.startsWith("/api") && !hasStaticAssetExt(req.path) && req.accepts("html")) {
      return sendHtmlFile(res, FRONTEND_ENTRY_PATH, hotReloadManager.enabled);
    }
    return next();
  });
}

function expressStaticWithCache(rootPath, options) {
  // 延迟 require，避免循环依赖或测试场景下提前加载。
  // eslint-disable-next-line global-require
  const express = require("express");
  return express.static(rootPath, options);
}

module.exports = {
  createHotReloadManager,
  registerFrontend,
};
