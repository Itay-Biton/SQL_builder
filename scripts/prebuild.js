const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("\n" + "=".repeat(60));
console.log("  SQL BUILDER - PRODUCTION BUILD PREPARATION");
console.log("=".repeat(60) + "\n");

const frontendDir = path.resolve(__dirname, "../SQL_Builder_Frontend");
const backendDir = path.resolve(__dirname, "../SQL_Builder_Server");
const publicDir = path.join(backendDir, "public");
const frontendDistDir = path.join(frontendDir, "dist");

// Step 1: Build frontend
console.log("[1/5] Building frontend...");
console.log(`      Location: ${frontendDir}`);

try {
  process.chdir(frontendDir);

  // Install dependencies if needed
  if (!fs.existsSync(path.join(frontendDir, "node_modules"))) {
    console.log("      Installing frontend dependencies...");
    execSync("npm ci", { stdio: "inherit" });
  }

  // Build frontend
  console.log("      Running build...");
  execSync("npm run build", { stdio: "inherit" });
  console.log("      ✓ Frontend build complete\n");
} catch (err) {
  console.error("      ✗ Frontend build failed:", err.message);
  process.exit(1);
}

// Step 2: Clean old public directory
console.log("[2/5] Cleaning old backend public directory...");
console.log(`      Location: ${publicDir}`);

try {
  if (fs.existsSync(publicDir)) {
    fs.rmSync(publicDir, { recursive: true, force: true });
    console.log("      ✓ Old public directory removed\n");
  } else {
    console.log("      ✓ No previous public directory found\n");
  }
} catch (err) {
  console.error("      ✗ Failed to clean public directory:", err.message);
  process.exit(1);
}

// Step 3: Create new public directory
console.log("[3/5] Creating new public directory...");

try {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log("      ✓ Public directory created\n");
} catch (err) {
  console.error("      ✗ Failed to create public directory:", err.message);
  process.exit(1);
}

// Step 4: Copy frontend dist to backend public
console.log("[4/5] Copying frontend build to backend...");
console.log(`      From: ${frontendDistDir}`);
console.log(`      To:   ${publicDir}`);

try {
  if (!fs.existsSync(frontendDistDir)) {
    throw new Error(`Frontend dist directory not found: ${frontendDistDir}`);
  }

  // Copy all files from dist to public
  copyRecursiveSync(frontendDistDir, publicDir);

  // Count files copied
  const fileCount = countFiles(publicDir);
  console.log(`      ✓ Copied ${fileCount} files\n`);
} catch (err) {
  console.error("      ✗ Failed to copy frontend build:", err.message);
  process.exit(1);
}

// Step 5: Verify build output
console.log("[5/5] Verifying build output...");

try {
  const indexPath = path.join(publicDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error("index.html not found in public directory");
  }

  const assetsDir = path.join(publicDir, "assets");
  if (!fs.existsSync(assetsDir)) {
    console.warn("      ⚠ Warning: assets directory not found");
  }

  console.log("      ✓ Build output verified\n");
} catch (err) {
  console.error("      ✗ Build verification failed:", err.message);
  process.exit(1);
}

console.log("=".repeat(60));
console.log("  ✓ PREBUILD COMPLETE");
console.log("=".repeat(60) + "\n");
console.log("Frontend build has been prepared for production packaging.");
console.log("Backend public directory is ready at:");
console.log(`  ${publicDir}\n`);

// Helper functions
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName),
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function countFiles(dir) {
  let count = 0;
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      count += countFiles(fullPath);
    } else {
      count++;
    }
  }

  return count;
}
