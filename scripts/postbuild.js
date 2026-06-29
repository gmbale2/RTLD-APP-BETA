#!/usr/bin/env node
/**
 * postbuild.js — run after `expo export --platform web`
 *
 * Copies all TTF font files from the deep pnpm asset paths into a flat
 * /fonts/ directory inside dist/, then patches the JS bundle to reference
 * those short URLs instead. This avoids potential CDN URL-encoding issues
 * with the @ and + characters inside node_modules/.pnpm/... paths.
 */

const fs   = require("fs");
const path = require("path");

const DIST   = path.resolve(__dirname, "..", "dist");
const ASSETS = path.join(DIST, "assets");
const FONTS  = path.join(DIST, "fonts");

if (!fs.existsSync(DIST)) {
  console.error("dist/ not found — run expo export first");
  process.exit(1);
}

fs.mkdirSync(FONTS, { recursive: true });

// Collect all TTF files under dist/assets
function findTTFs(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findTTFs(full, results);
    else if (entry.name.endsWith(".ttf")) results.push(full);
  }
  return results;
}

const ttfs = findTTFs(ASSETS);
console.log(`Found ${ttfs.length} TTF files`);

// Build a map from long asset path → short /fonts/<name> path
const replacements = [];
for (const ttf of ttfs) {
  const name    = path.basename(ttf);
  const dest    = path.join(FONTS, name);
  const longUrl = "/assets/" + path.relative(ASSETS, ttf).replace(/\\/g, "/");
  const shortUrl = "/fonts/" + name;

  fs.copyFileSync(ttf, dest);
  replacements.push({ from: longUrl, to: shortUrl });
  console.log(`  ${name}`);
}

// Find the JS bundle(s) and patch them
const jsDir = path.join(DIST, "_expo", "static", "js", "web");
const bundles = fs.existsSync(jsDir)
  ? fs.readdirSync(jsDir).filter(f => f.endsWith(".js")).map(f => path.join(jsDir, f))
  : [];

for (const bundle of bundles) {
  let src = fs.readFileSync(bundle, "utf8");
  let changed = 0;
  for (const { from, to } of replacements) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "g");
    const before = src;
    src = src.replace(re, to);
    if (src !== before) changed++;
  }
  fs.writeFileSync(bundle, src);
  console.log(`Patched ${path.basename(bundle)}: ${changed} replacements`);
}

console.log("Done.");
