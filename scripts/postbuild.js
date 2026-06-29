#!/usr/bin/env node
/**
 * postbuild.js — run after `expo export --platform web`
 *
 * 1. Copies all TTF font files to a flat /fonts/ directory and patches the JS
 *    bundle to use those clean URLs (avoids CDN issues with pnpm @ and + chars).
 * 2. Injects <link rel="preload"> hints for critical fonts into index.html so
 *    the browser starts fetching them before the JS bundle even parses.
 */

const fs   = require("fs");
const path = require("path");

const DIST      = path.resolve(__dirname, "..", "dist");
const ASSETS    = path.join(DIST, "assets");
const FONTS_DIR = path.join(DIST, "fonts");
const INDEX     = path.join(DIST, "index.html");

if (!fs.existsSync(DIST)) {
  console.error("dist/ not found — run expo export first");
  process.exit(1);
}

fs.mkdirSync(FONTS_DIR, { recursive: true });

// ── 1. Collect all TTF files under dist/assets ────────────────────────────

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

const replacements = [];
for (const ttf of ttfs) {
  const name     = path.basename(ttf);
  const dest     = path.join(FONTS_DIR, name);
  const longUrl  = "/assets/" + path.relative(ASSETS, ttf).replace(/\\/g, "/");
  const shortUrl = "/fonts/" + name;

  fs.copyFileSync(ttf, dest);
  replacements.push({ from: longUrl, to: shortUrl, name, shortUrl });
  console.log(`  ${name}`);
}

// ── 2. Patch JS bundle(s) ─────────────────────────────────────────────────

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

// ── 3. Inject <link rel="preload"> for critical fonts in index.html ───────

// These are the fonts rendered on first paint — preloading them means the
// browser fetches them in parallel with the JS bundle, cutting perceived load
// time on mobile by 1–3 seconds on slow connections.
const CRITICAL = [
  "Inter_700Bold",
  "Inter_400Regular",
  "FontAwesome5_Solid",
  "FontAwesome5_Brands",
  "FontAwesome6_Brands",
];

const preloadLinks = replacements
  .filter(r => CRITICAL.some(name => r.name.startsWith(name)))
  .map(r => `  <link rel="preload" href="${r.shortUrl}" as="font" type="font/ttf" crossorigin>`)
  .join("\n");

if (fs.existsSync(INDEX) && preloadLinks) {
  let html = fs.readFileSync(INDEX, "utf8");
  html = html.replace("</head>", `${preloadLinks}\n</head>`);
  fs.writeFileSync(INDEX, html);
  console.log(`Injected ${CRITICAL.length} font preload hints into index.html`);
}

console.log("Done.");
