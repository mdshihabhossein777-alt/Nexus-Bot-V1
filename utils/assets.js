/**
 * utils/assets.js
 * NEXUS BOT V1 — Local assets loader (with GitHub fallback)
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══ GitHub config ═══ */
const GITHUB_USER = "mdshihabhossein777-alt";
const GITHUB_REPO = "Nexus-Bot-V1";
const GITHUB_BRANCH = "main";

/* ═══ Local assets folder ═══ */
const LOCAL_ASSETS = path.join(__dirname, "..", "assets");

/* ═══ Cache ═══ */
const CACHE_DIR = path.join(os.tmpdir(), "nexus-assets-cache");
fs.ensureDirSync(CACHE_DIR);

/* ═══ Load asset — local first, then GitHub ═══ */
async function loadAsset(filename) {
  if (!filename) return null;

  /* 1. Try local file */
  try {
    const localPath = path.join(LOCAL_ASSETS, filename);
    if (fs.existsSync(localPath)) {
      const buf = await fs.readFile(localPath);
      if (buf.length > 100) {
        console.log(`[assets] local: ${filename} (${(buf.length / 1024).toFixed(0)} KB)`);
        return buf;
      }
    }
  } catch (_) {}

  /* 2. Try cache */
  const cacheFile = path.join(CACHE_DIR, filename.replace(/[\/\\]/g, "_"));
  try {
    if (fs.existsSync(cacheFile)) {
      const buf = await fs.readFile(cacheFile);
      if (buf.length > 100) {
        console.log(`[assets] cache: ${filename}`);
        return buf;
      }
    }
  } catch (_) {}

  /* 3. Try GitHub */
  try {
    const url = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/assets/${filename}`;
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024,
      headers: { "User-Agent": "NEXUS-BOT/1.0" }
    });

    const buf = Buffer.from(r.data);
    if (buf.length < 100) return null;

    try { await fs.writeFile(cacheFile, buf); } catch (_) {}
    console.log(`[assets] github: ${filename}`);
    return buf;
  } catch (e) {
    console.log(`[assets] fail ${filename}: ${e.message.slice(0, 50)}`);
    return null;
  }
}

/* ═══ Save to temp file for sendMessage ═══ */
async function saveAssetToTemp(filename) {
  const buf = await loadAsset(filename);
  if (!buf) return null;

  let ext = "bin";
  if (buf[0] === 0xFF && buf[1] === 0xD8) ext = "jpg";
  else if (buf[0] === 0x89 && buf[1] === 0x50) ext = "png";
  else if (buf.slice(0, 3).toString() === "GIF") ext = "gif";
  else if (buf.slice(0, 4).toString() === "RIFF") ext = "webp";
  else if (buf.slice(4, 8).toString() === "ftyp") ext = "mp4";
  else {
    const m = filename.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov|mp3)$/i);
    if (m) ext = m[1].toLowerCase();
  }

  const tmp = path.join(os.tmpdir(), `asset_${Date.now()}_${filename.replace(/[\/\\]/g, "_")}.${ext}`);
  await fs.writeFile(tmp, buf);
  return { path: tmp, buffer: buf, ext };
}

function getAssetUrl(filename) {
  return `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/assets/${filename}`;
}

function clearCache() {
  try { fs.emptyDirSync(CACHE_DIR); return true; } catch (_) { return false; }
}

module.exports = {
  loadAsset,
  saveAssetToTemp,
  getAssetUrl,
  clearCache,
  CACHE_DIR,
  LOCAL_ASSETS,
  GITHUB_USER,
  GITHUB_REPO,
  GITHUB_BRANCH
};

// © 2026 NEXUS BOT V1