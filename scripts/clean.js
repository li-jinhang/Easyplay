const fs = require("fs");
const path = require("path");

const outputDir = process.env.BUILD_OUTDIR || "dist";
const resolvedOutputDir = path.resolve(process.cwd(), outputDir);

try {
  fs.rmSync(resolvedOutputDir, { recursive: true, force: true });
  // eslint-disable-next-line no-console
  console.log(`[clean] Removed ${resolvedOutputDir}`);
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(`[clean] Failed to remove ${resolvedOutputDir}:`, error.message);
  process.exit(1);
}
