const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "dist-linux");
const destDir = path.join(root, "dist-linux-arm64");

const sharedFiles = [".env.example", "How-To-Use.md"];

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

for (const file of sharedFiles) {
  const from = path.join(srcDir, file);
  const to = path.join(destDir, file);
  if (!fs.existsSync(from)) {
    console.error(`Missing source file: ${from}`);
    process.exit(1);
  }
  fs.copyFileSync(from, to);
  console.log(`  copied ${file}`);
}

const binary = path.join(destDir, "sql-builder-server");
if (!fs.existsSync(binary)) {
  console.warn("  warning: dist-linux-arm64/sql-builder-server not found (run pkg first)");
} else {
  fs.chmodSync(binary, 0o755);
  console.log("  set executable on sql-builder-server");
}

console.log(`Staged Linux ARM64 dist at: ${destDir}`);
