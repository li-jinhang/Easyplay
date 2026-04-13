const fs = require("fs/promises");
const path = require("path");
const { transform } = require("esbuild");

const projectRoot = process.cwd();
const cliArgs = parseCliArgs(process.argv.slice(2));
const outputDir = cliArgs.outdir || process.env.BUILD_OUTDIR || "dist";
const outRoot = path.resolve(projectRoot, outputDir);
const buildEnv = cliArgs.env || process.env.BUILD_ENV || process.env.NODE_ENV || "production";
const isProd = buildEnv === "production";
const shouldMinify = normalizeBoolean(
  cliArgs.minify || process.env.BUILD_MINIFY,
  isProd
);
const withSourceMap = normalizeBoolean(
  cliArgs.sourcemap || process.env.BUILD_SOURCEMAP,
  false
);
const target = cliArgs.target || process.env.BUILD_TARGET || "es2020";

const includeRoots = ["apps", "services", "index.html", "main.js", ".env.example"];
const ignoredSegments = new Set(["node_modules", "coverage", ".git", "dist"]);
const ignoredFileSuffixes = [".test.js", ".spec.js"];

function parseCliArgs(args) {
  return args.reduce((acc, current) => {
    if (!current.startsWith("--")) {
      return acc;
    }
    const [rawKey, ...rest] = current.slice(2).split("=");
    const value = rest.length > 0 ? rest.join("=") : "true";
    acc[rawKey.trim().toLowerCase()] = value.trim();
    return acc;
  }, {});
}

function normalizeBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return String(value).toLowerCase() === "true";
}

function isIgnoredPath(absolutePath) {
  const relative = path.relative(projectRoot, absolutePath).replace(/\\/g, "/");
  if (!relative || relative.startsWith("..")) {
    return true;
  }
  const segments = relative.split("/");
  if (segments.some((segment) => ignoredSegments.has(segment))) {
    return true;
  }
  return ignoredFileSuffixes.some((suffix) => relative.endsWith(suffix));
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function compileJs(sourcePath, outputPath) {
  const source = await fs.readFile(sourcePath, "utf8");
  const result = await transform(source, {
    loader: "js",
    format: "cjs",
    target,
    minify: shouldMinify,
    sourcemap: withSourceMap ? "external" : false,
    legalComments: "none",
    charset: "utf8",
  });
  await ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, result.code, "utf8");
  if (withSourceMap && result.map) {
    await fs.writeFile(`${outputPath}.map`, result.map, "utf8");
  }
}

async function copyFile(sourcePath, outputPath) {
  await ensureDir(path.dirname(outputPath));
  await fs.copyFile(sourcePath, outputPath);
}

async function walkAndBuild(sourcePath) {
  if (isIgnoredPath(sourcePath)) {
    return;
  }

  const stat = await fs.stat(sourcePath);
  if (stat.isDirectory()) {
    const entries = await fs.readdir(sourcePath);
    await Promise.all(entries.map((entry) => walkAndBuild(path.join(sourcePath, entry))));
    return;
  }

  const relative = path.relative(projectRoot, sourcePath);
  const targetPath = path.join(outRoot, relative);
  if (sourcePath.endsWith(".js")) {
    await compileJs(sourcePath, targetPath);
    return;
  }
  await copyFile(sourcePath, targetPath);
}

async function run() {
  const start = Date.now();
  await fs.rm(outRoot, { recursive: true, force: true });
  await Promise.all(
    includeRoots.map(async (entry) => {
      const sourcePath = path.resolve(projectRoot, entry);
      try {
        await fs.access(sourcePath);
      } catch {
        return;
      }
      await walkAndBuild(sourcePath);
    })
  );

  const elapsed = Date.now() - start;
  // eslint-disable-next-line no-console
  console.log(
    `[build] env=${buildEnv} minify=${shouldMinify} sourcemap=${withSourceMap} target=${target}`
  );
  // eslint-disable-next-line no-console
  console.log(`[build] output=${outRoot}`);
  // eslint-disable-next-line no-console
  console.log(`[build] completed in ${elapsed}ms`);
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("[build] failed:", error);
  process.exit(1);
});
