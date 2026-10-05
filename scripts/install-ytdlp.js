/* scripts/install-ytdlp.js
   Download yt-dlp binary + verify for Render/Linux
   Fixed: redirect handling, retry, timeout, arch detect, verify
*/
"use strict";

const fs = require("fs-extra");
const path = require("path");
const https = require("https");
const os = require("os");
const crypto = require("crypto");

const BIN_DIR = path.join(__dirname, "..", "bin");
const YTDLP = path.join(BIN_DIR, "yt-dlp");

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 120000;

/* ═══════════════════════════════════════════════════════════════════
   ARCH DETECT
   ═══════════════════════════════════════════════════════════════════ */
function pickDownloadUrl() {
  const arch = os.arch();           /* x64, arm64, arm */
  const platform = os.platform();   /* linux, darwin, win32 */

  /* Windows */
  if (platform === "win32") {
    return "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
  }

  /* macOS */
  if (platform === "darwin") {
    return "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos";
  }

  /* Linux */
  if (arch === "arm64") {
    return "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64";
  }
  if (arch === "arm") {
    return "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_armv7l";
  }
  /* x64 default */
  return "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";
}

/* ═══════════════════════════════════════════════════════════════════
   DOWNLOAD WITH REDIRECTS + TIMEOUT (returns Buffer, no file race)
   ═══════════════════════════════════════════════════════════════════ */
function fetchBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > MAX_REDIRECTS) {
      return reject(new Error("Too many redirects"));
    }

    let settled = false;
    const settle = (fn, v) => {
      if (settled) return;
      settled = true;
      fn(v);
    };

    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": UA,
          "Accept": "application/octet-stream,*/*"
        }
      },
      (res) => {
        /* Redirect */
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume(); /* drain */
          const next = res.headers.location;
          if (!next) return settle(reject, new Error("Redirect without location"));
          return fetchBuffer(next, redirects + 1).then(
            (b) => settle(resolve, b),
            (e) => settle(reject, e)
          );
        }

        if (res.statusCode !== 200) {
          res.resume();
          return settle(reject, new Error("HTTP " + res.statusCode));
        }

        const chunks = [];
        let total = 0;
        const MAX_SIZE = 50 * 1024 * 1024; /* 50 MB safety */

        res.on("data", (c) => {
          total += c.length;
          if (total > MAX_SIZE) {
            req.destroy();
            return settle(reject, new Error("File too large (>50MB)"));
          }
          chunks.push(c);
        });

        res.on("end", () => settle(resolve, Buffer.concat(chunks)));
        res.on("error", (e) => settle(reject, e));
      }
    );

    req.on("error", (e) => settle(reject, e));

    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy();
      settle(reject, new Error("Timeout after " + (TIMEOUT_MS / 1000) + "s"));
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   VERIFY BINARY (ELF header, non-empty)
   ═══════════════════════════════════════════════════════════════════ */
function isBinaryValid(buf) {
  if (!buf || buf.length < 100000) return false; /* yt-dlp ~20MB, but at least 100KB */

  /* Check for HTML error page */
  const head = buf.slice(0, 200).toString("utf8").toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html")) return false;

  /* ELF magic for Linux */
  if (buf[0] === 0x7F && buf[1] === 0x45 && buf[2] === 0x4C && buf[3] === 0x46) return true;

  /* Mach-O magic for macOS */
  if (buf[0] === 0xCF && buf[1] === 0xFA && buf[2] === 0xED && buf[3] === 0xFE) return true;
  if (buf[0] === 0xCA && buf[1] === 0xFE && buf[2] === 0xBA && buf[3] === 0xBE) return true;

  /* PE/EXE for Windows (MZ) */
  if (buf[0] === 0x4D && buf[1] === 0x5A) return true;

  /* Python script (starts with #!) */
  if (buf[0] === 0x23 && buf[1] === 0x21) return true;

  return false;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN INSTALL
   ═══════════════════════════════════════════════════════════════════ */
async function install() {
  try {
    fs.ensureDirSync(BIN_DIR);

    /* Skip if already exists AND valid */
    if (fs.existsSync(YTDLP)) {
      try {
        const stat = fs.statSync(YTDLP);
        if (stat.size > 100000) {
          console.log("[yt-dlp] already installed:", stat.size, "bytes");
          return true;
        }
      } catch (_) {}
      try { fs.unlinkSync(YTDLP); } catch (_) {}
    }

    const url = pickDownloadUrl();
    console.log("[yt-dlp] downloading for", os.platform(), os.arch());
    console.log("[yt-dlp] url:", url);

    /* Retry up to 3 times */
    let buf = null;
    let lastErr = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[yt-dlp] attempt ${attempt}/3...`);
        buf = await fetchBuffer(url);
        if (isBinaryValid(buf)) {
          console.log(`[yt-dlp] ✓ downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
          break;
        }
        console.log(`[yt-dlp] attempt ${attempt}: invalid file (${buf.length} bytes, likely HTML)`);
        buf = null;
        await new Promise((r) => setTimeout(r, 2000));
      } catch (e) {
        console.log(`[yt-dlp] attempt ${attempt} failed: ${e.message}`);
        lastErr = e;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (!buf) {
      throw lastErr || new Error("Download failed after 3 attempts");
    }

    /* Atomic write: temp → rename */
    const tmpPath = YTDLP + ".tmp_" + Date.now();
    fs.writeFileSync(tmpPath, buf);

    /* Move into place */
    try {
      if (fs.existsSync(YTDLP)) fs.unlinkSync(YTDLP);
      fs.renameSync(tmpPath, YTDLP);
    } catch (e) {
      /* Fallback: copy */
      fs.copySync(tmpPath, YTDLP);
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    }

    /* chmod (skip on Windows) */
    if (os.platform() !== "win32") {
      try {
        fs.chmodSync(YTDLP, 0o755);
        console.log("[yt-dlp] chmod 755 ✓");
      } catch (e) {
        console.log("[yt-dlp] chmod failed (non-fatal):", e.message);
      }
    }

    /* Verify final file */
    const finalStat = fs.statSync(YTDLP);
    console.log(`[yt-dlp] ✅ installed at ${YTDLP} (${(finalStat.size / 1024 / 1024).toFixed(1)} MB)`);
    return true;

  } catch (e) {
    console.error("[yt-dlp] install failed:", e.message);
    /* Non-fatal — bot will use fallback downloaders */
    return false;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ENTRY
   ═══════════════════════════════════════════════════════════════════ */
if (require.main === module) {
  install().then((ok) => {
    process.exit(ok ? 0 : 0); /* always exit 0 to not break npm install */
  });
} else {
  module.exports = install;
}