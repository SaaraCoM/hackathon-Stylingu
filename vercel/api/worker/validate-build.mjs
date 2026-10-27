// validate-build.mjs
//
// Local pre-deploy validator: copies backend/src/ into .vercel-validate/backend/,
// patches backend/src/index.js to remove side effects, and imports it to assert the
// expected app shape. Standalone so worker/index.js stays free of build-time logic.
//
// Run from vercel/api/worker:
//   node validate-build.mjs
//
// Exit 0 = OK, exit 1 = FAIL (with error printed to stderr).

import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const projectRoot = path.resolve(__dirname, "..", "..", "..");
const backendDir = path.resolve(projectRoot, "backend");
const backendFile = path.resolve(backendDir, "src", "index.js");

if (!fs.existsSync(backendFile)) {
  console.error("✗ backend/src/index.js not found at", backendFile);
  process.exit(1);
}

function patchBackendSource(src) {
  // Replace side-effecting lines (connectDB + app.listen) so the module becomes
  // importable for validation without network/listen side effects.
  let patched = src.replace(
    /^\s*(await\s+)?connectDB\s*\([^;]*\);\s*$/m,
    "/* connectDB replaced by build for local validation */"
  );
  patched = patched.replace(
    /^\s*app\.listen\s*\([^;]*\);\s*$/m,
    "/* app.listen replaced by build for local validation */"
  );
  return patched;
}

const tmpRoot = path.resolve(__dirname, ".vercel-validate");
const backendCopyRoot = path.resolve(tmpRoot, "backend");
const patchedBackendSrc = path.resolve(backendCopyRoot, "src");

fs.rmSync(tmpRoot, { recursive: true, force: true });
fs.mkdirSync(patchedBackendSrc, { recursive: true });

fs.writeFileSync(
  path.resolve(backendCopyRoot, "package.json"),
  fs.readFileSync(path.resolve(backendDir, "package.json"), "utf8"),
  "utf8"
);

const srcDir = path.resolve(backendDir, "src");
for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
  const src = path.resolve(srcDir, entry.name);
  const dst = path.resolve(patchedBackendSrc, entry.name);
  if (entry.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const sub of fs.readdirSync(src, { withFileTypes: true })) {
      fs.writeFileSync(
        path.resolve(dst, sub.name),
        fs.readFileSync(path.resolve(src, sub.name), "utf8"),
        "utf8"
      );
    }
  } else if (entry.isFile()) {
    fs.writeFileSync(dst, fs.readFileSync(src, "utf8"), "utf8");
  }
}

// Best effort: copy backend/node_modules into the temp mirror so the patched app
// can resolve its deps (express, mongoose, etc.) for local validation.
const backendNodeModules = path.resolve(backendDir, "node_modules");
if (fs.existsSync(backendNodeModules)) {
  const dstNodeModules = path.resolve(backendCopyRoot, "node_modules");
  fs.mkdirSync(dstNodeModules, { recursive: true });

  // Copy in two passes: first files, then directories. For directories we recurse;
  // for files we copy bytes. Skip entries that fail (symlinks, permissions, big files).
  const list = fs.readdirSync(backendNodeModules, { withFileTypes: true });
  for (const entry of list) {
    const src = path.resolve(backendNodeModules, entry.name);
    const dst = path.resolve(dstNodeModules, entry.name);
    try {
      if (entry.isFile() || entry.isSymbolicLink()) {
        const stat = fs.lstatSync(src);
        // Only copy small-ish files; skip huge binaries.
        if (stat.size > 5 * 1024 * 1024) continue;
        fs.copyFileSync(src, dst);
      } else if (entry.isDirectory()) {
        copyDirRecursive(src, dst);
      }
    } catch {
      // skip problematic entries
    }
  }
}

fs.writeFileSync(
  path.resolve(patchedBackendSrc, "index.js"),
  patchBackendSource(fs.readFileSync(backendFile, "utf8")),
  "utf8"
);

// Helper for recursive directory copy.
function copyDirRecursive(srcDir, dstDir) {
  fs.mkdirSync(dstDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.resolve(srcDir, entry.name);
    const dst = path.resolve(dstDir, entry.name);
    try {
      if (entry.isFile() || entry.isSymbolicLink()) {
        const stat = fs.lstatSync(src);
        if (stat.size > 5 * 1024 * 1024) continue;
        fs.copyFileSync(src, dst);
      } else if (entry.isDirectory()) {
        copyDirRecursive(src, dst);
      }
    } catch {
      // skip
    }
  }
}

const patchedIndexPath = path.resolve(patchedBackendSrc, "index.js");

try {
  const mod = require(patchedIndexPath);
  const exported = mod && mod.default ? mod.default : mod;
  const ok =
    exported &&
    (typeof exported.fetch === "function" ||
      typeof exported.handler === "function" ||
      typeof exported.handle === "function" ||
      typeof exported === "function" ||
      (exported && typeof exported.use === "function"));
  if (!ok) {
    console.error(
      "✗ backend/src/index.js did not expose an Express/Hono app.\n" +
        "  Expected a function, { fetch(request) }, { handler(req,res) }, { handle(req,res) }, or express app."
    );
    process.exit(1);
  }
  const appType =
    typeof exported.fetch === "function"
      ? "fetch"
      : typeof exported.handler === "function"
      ? "handler"
      : typeof exported.handle === "function"
      ? "handle"
      : typeof exported === "function"
      ? "function"
      : "express";
  console.log("✓ OK — backend/src/index.js resolves to app type:", appType);
} catch (err) {
  console.error("✗ validation failed:", err && err.message);
  process.exit(1);
}
