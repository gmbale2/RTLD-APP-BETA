#!/usr/bin/env node
// Flattens pnpm-nested asset paths in the Expo web dist folder.
// Netlify's CDN 404s on paths containing @ and + characters.
// Run this after `expo export -p web` and before `netlify deploy`.

const fs   = require("fs");
const path = require("path");

const distDir      = path.join(__dirname, "..", "dist");
const nodeModsDir  = path.join(distDir, "assets", "node_modules");
const vendorDir    = path.join(distDir, "assets", "vendor");

if (!fs.existsSync(nodeModsDir)) {
  console.log("No nested assets found — nothing to flatten.");
  process.exit(0);
}

fs.mkdirSync(vendorDir, { recursive: true });

// ── 1. Collect all files under assets/node_modules ───────────────────────────

function walk(dir, results = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, results);
    else results.push(full);
  }
  return results;
}

const files = walk(nodeModsDir);
const mapping = {}; // oldUrlPath -> newUrlPath

for (const file of files) {
  const basename    = path.basename(file);
  const oldRelPath  = path.relative(distDir, file).replace(/\\/g, "/");
  const newRelPath  = `assets/vendor/${basename}`;
  const dest        = path.join(distDir, newRelPath);

  fs.copyFileSync(file, dest);
  mapping[`/${oldRelPath}`] = `/${newRelPath}`;
}

// ── 2. Patch the JS bundle ────────────────────────────────────────────────────

const jsDir   = path.join(distDir, "_expo", "static", "js", "web");
const bundles = fs.readdirSync(jsDir).filter((f) => f.endsWith(".js"));

for (const bundle of bundles) {
  const bundlePath = path.join(jsDir, bundle);
  let content = fs.readFileSync(bundlePath, "utf-8");

  for (const [oldPath, newPath] of Object.entries(mapping)) {
    content = content.replaceAll(oldPath, newPath);
  }

  fs.writeFileSync(bundlePath, content);
}

// ── 3. Remove the now-redundant nested folder ────────────────────────────────

fs.rmSync(nodeModsDir, { recursive: true, force: true });

console.log(`✓ Flattened ${files.length} assets → /assets/vendor/`);
console.log(`✓ Patched ${bundles.length} bundle(s)`);
