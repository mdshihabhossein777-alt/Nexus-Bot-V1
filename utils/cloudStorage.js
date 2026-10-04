/**
 * utils/cloudStorage.js
 * NEXUS BOT V1 — Cloud storage helper
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const DATA_DIR = path.join(__dirname, "..", "data");
const CLOUD_FILE = path.join(DATA_DIR, "cloud.json");

/* ═══ Load all cloud data ═══ */
function loadCloud() {
  try {
    return fs.readJsonSync(CLOUD_FILE) || {};
  } catch (_) {
    return {};
  }
}

/* ═══ Save cloud data ═══ */
function saveCloud(data) {
  try {
    fs.writeJsonSync(CLOUD_FILE, data);
  } catch (e) {
    console.error("[cloudStorage] save failed:", e.message);
  }
}

/* ═══ Get all files for a user ═══ */
function getCloudFiles(userID) {
  const cloud = loadCloud();
  const uid = String(userID);
  const files = cloud[uid] || {};
  return Object.values(files);
}

/* ═══ Get specific file by exact name ═══ */
function getCloudFile(userID, name) {
  const cloud = loadCloud();
  const uid = String(userID);
  const files = cloud[uid] || {};
  return files[name] || null;
}

/* ═══ Get files by name prefix ═══ */
function getCloudFilesByName(userID, prefix) {
  const cloud = loadCloud();
  const uid = String(userID);
  const files = cloud[uid] || {};

  return Object.values(files).filter((f) =>
    f.name && f.name.toLowerCase().startsWith(prefix.toLowerCase())
  );
}

/* ═══ Get random file by prefix ═══ */
function getRandomCloudFile(userID, prefix) {
  const files = getCloudFilesByName(userID, prefix);
  if (!files.length) return null;
  return files[Math.floor(Math.random() * files.length)];
}

/* ═══ Get all image files ═══ */
function getCloudImages(userID) {
  return getCloudFiles(userID).filter((f) => f.type === "image" || f.type === "gif");
}

/* ═══ Download file buffer from cloud URL ═══ */
async function downloadCloudFile(file, options = {}) {
  if (!file || !file.url) return null;

  const timeout = options.timeout || 30000;
  const maxSize = options.maxSize || 25 * 1024 * 1024; /* 25MB */

  try {
    const r = await axios.get(file.url, {
      responseType: "arraybuffer",
      timeout,
      maxContentLength: maxSize,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/*,video/*,*/*"
      }
    });

    const buf = Buffer.from(r.data);
    if (buf.length < 100) return null;
    if (buf.length > maxSize) return null;

    return buf;
  } catch (e) {
    console.log(`[cloudStorage] download failed: ${e.message.slice(0, 60)}`);
    return null;
  }
}

/* ═══ Get file buffer by name (shortcut) ═══ */
async function getCloudFileBuffer(userID, name, options = {}) {
  const file = getCloudFile(userID, name);
  if (!file) return null;
  return await downloadCloudFile(file, options);
}

/* ═══ Get random file buffer by prefix ═══ */
async function getRandomCloudBuffer(userID, prefix, options = {}) {
  const file = getRandomCloudFile(userID, prefix);
  if (!file) return null;
  return await downloadCloudFile(file, options);
}

/* ═══ Check if file exists ═══ */
function hasCloudFile(userID, name) {
  return getCloudFile(userID, name) !== null;
}

/* ═══ Count files ═══ */
function getCloudFileCount(userID) {
  return getCloudFiles(userID).length;
}

/* ═══ Get total storage size (bytes) ═══ */
function getCloudTotalSize(userID) {
  return getCloudFiles(userID).reduce((sum, f) => sum + (f.size || 0), 0);
}

/* ═══ Add file to cloud (manual) ═══ */
function addCloudFile(userID, name, fileData) {
  const cloud = loadCloud();
  const uid = String(userID);
  if (!cloud[uid]) cloud[uid] = {};

  cloud[uid][name] = {
    name,
    type: fileData.type || "image",
    url: fileData.url,
    size: fileData.size || 0,
    ext: fileData.ext || "bin",
    savedAt: Date.now()
  };

  saveCloud(cloud);
  return cloud[uid][name];
}

/* ═══ Delete file ═══ */
function deleteCloudFile(userID, name) {
  const cloud = loadCloud();
  const uid = String(userID);
  if (!cloud[uid] || !cloud[uid][name]) return false;

  delete cloud[uid][name];
  saveCloud(cloud);
  return true;
}

/* ═══ Get all categories (grouped by type) ═══ */
function getCloudByType(userID) {
  const files = getCloudFiles(userID);
  const groups = { image: [], gif: [], video: [], audio: [], file: [] };

  for (const f of files) {
    const type = f.type || "file";
    if (!groups[type]) groups[type] = [];
    groups[type].push(f);
  }

  return groups;
}

/* ═══════════════════════════════════════════════════════════
   EXPORTS
   ═══════════════════════════════════════════════════════════ */
module.exports = {
  /* Core functions */
  loadCloud,
  saveCloud,

  /* Query functions */
  getCloudFiles,
  getCloudFile,
  getCloudFilesByName,
  getRandomCloudFile,
  getCloudImages,
  getCloudByType,

  /* Download functions */
  downloadCloudFile,
  getCloudFileBuffer,
  getRandomCloudBuffer,

  /* Utility functions */
  hasCloudFile,
  getCloudFileCount,
  getCloudTotalSize,

  /* Mutation functions */
  addCloudFile,
  deleteCloudFile,

  /* Constants */
  CLOUD_FILE,
  DATA_DIR
};

// © 2026 NEXUS BOT V1