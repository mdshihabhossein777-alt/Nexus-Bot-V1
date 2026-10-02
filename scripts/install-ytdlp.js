/* scripts/install-ytdlp.js
   Download yt-dlp binary + ffmpeg-static fallback for Render/Linux */
"use strict";

const fs = require("fs-extra");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");

const BIN_DIR = path.join(__dirname, "..", "bin");
const YTDLP = path.join(BIN_DIR, "yt-dlp");

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error("HTTP " + res.statusCode));
      }
      res.pipe(file);
      file.on("finish", () => file.close(() => resolve()));
    }).on("error", (e) => {
      fs.unlink(dest).catch(() => {});
      reject(e);
    });
  });
}

(async () => {
  try {
    fs.ensureDirSync(BIN_DIR);

    if (fs.existsSync(YTDLP)) {
      console.log("[yt-dlp] already installed at", YTDLP);
      return;
    }

    const url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";
    console.log("[yt-dlp] downloading binary...");
    await download(url, YTDLP);

    fs.chmodSync(YTDLP, 0o755);
    console.log("[yt-dlp] installed ✓ at", YTDLP);
  } catch (e) {
    console.error("[yt-dlp] install failed:", e.message);
    // Non-fatal — bot ekhono iTunes fallback diye kaj korbe
  }
})();