const axios = require("axios");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

/* ---------- Reaction helper ---------- */
function react(api, emoji, messageID, threadID) {
  return new Promise((resolve) => {
    if (!messageID || !threadID) return resolve(false);
    try {
      api.setMessageReaction(emoji, messageID, threadID, (err) => resolve(!err));
    } catch (_) { resolve(false); }
  });
}

/* ---------- Get bot's Facebook cookies ---------- */
function getBotCookies(api) {
  let cookieStr = "";

  try {
    if (api && typeof api.getAppState === "function") {
      const appState = api.getAppState() || [];
      cookieStr = appState
        .filter((c) => c && c.key && c.value)
        .map((c) => `${c.key}=${c.value}`)
        .join("; ");
    }
  } catch (_) {}

  if (!cookieStr) {
    try {
      const appStateFile = path.join(__dirname, "..", "..", "appstate.json");
      if (fs.existsSync(appStateFile)) {
        const appState = fs.readJsonSync(appStateFile);
        if (Array.isArray(appState)) {
          cookieStr = appState
            .filter((c) => c && c.key && c.value)
            .map((c) => `${c.key}=${c.value}`)
            .join("; ");
        }
      }
    } catch (_) {}
  }

  return cookieStr;
}

/* ---------- Fetch screenshot with cookies (for Facebook) ---------- */
async function fetchFBScreenshot(url, api, width = 1200, height = 900) {
  const cookies = getBotCookies(api);

  /* Use Facebook's internal screenshot API via thum.io with cookie passthrough */
  const encodedCookie = encodeURIComponent(cookies);
  const shotUrl = `https://image.thum.io/get/width/${width}/crop/${height}/allowJPG/cookies/${encodedCookie}/${url}`;

  const r = await axios.get(shotUrl, {
    responseType: "arraybuffer",
    timeout: 45000,
    headers: { "User-Agent": "Mozilla/5.0" },
    maxContentLength: 30 * 1024 * 1024
  });
  return Buffer.from(r.data);
}

/* ---------- Regular screenshot (non-FB sites) ---------- */
async function fetchScreenshot(url, mode = "desktop") {
  let shotUrl = "";

  switch (mode) {
    case "mobile":
    case "m":
      shotUrl = `https://image.thum.io/get/width/400/crop/800/allowJPG/viewportWidth/400/${url}`;
      break;
    case "tablet":
    case "t":
      shotUrl = `https://image.thum.io/get/width/800/crop/1000/allowJPG/viewportWidth/800/${url}`;
      break;
    case "full":
    case "f":
      shotUrl = `https://image.thum.io/get/width/1200/allowJPG/noanimate/${url}`;
      break;
    default:
      shotUrl = `https://image.thum.io/get/width/1200/crop/900/allowJPG/${url}`;
  }

  const r = await axios.get(shotUrl, {
    responseType: "arraybuffer",
    timeout: 45000,
    headers: { "User-Agent": "Mozilla/5.0" },
    maxContentLength: 30 * 1024 * 1024
  });
  return Buffer.from(r.data);
}

module.exports = {
  name: "screenshot",
  aliases: ["ss2", "webshot", "snap"],
  version: "3.0.0",
  role: 0,
  description: "Take screenshot of any website (with FB login for FB pages)",
  usage: "/screenshot <url> [mobile|tablet|full]",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;
    const FOOTER = "Powered by Shihab";
    let tmpPath = null;

    try {
      let url = args[0];
      if (!url) {
        return api.sendMessage(
          `📸 SCREENSHOT\n` +
          `────────────\n` +
          `📝 Usage: /screenshot <url> [options]\n\n` +
          `Options:\n` +
          `• /screenshot google.com         → Desktop\n` +
          `• /screenshot google.com mobile  → Mobile\n` +
          `• /screenshot google.com tablet  → Tablet\n` +
          `• /screenshot google.com full    → Full page\n\n` +
          `✨ ${FOOTER} ✨`,
          threadID
        );
      }

      if (!/^https?:\/\//i.test(url)) url = "https://" + url;

      try {
        new URL(url);
      } catch (_) {
        return api.sendMessage("⚠️ Invalid URL format.", threadID);
      }

      /* ---- Detect Facebook URL ---- */
      const isFacebook = /facebook\.com|fb\.com|fb\.watch|fb\.me/i.test(url);

      const mode = (args[1] || "desktop").toLowerCase();
      let modeLabel = "";

      switch (mode) {
        case "mobile": case "m": modeLabel = "📱 Mobile (400×800)"; break;
        case "tablet": case "t": modeLabel = "📱 Tablet (800×1000)"; break;
        case "full": case "f": modeLabel = "📄 Full Page"; break;
        default: modeLabel = "🖥️ Desktop (1200×900)";
      }

      /* React ⏳ */
      if (messageID) await react(api, "⏳", messageID, threadID);

      /* ---- Fetch ---- */
      const startedAt = Date.now();
      let buffer;

      if (isFacebook) {
        /* Use bot's cookies for Facebook */
        console.log("[screenshot] Facebook URL — using bot cookies");
        const width = mode === "mobile" ? 400 : 1200;
        const height = mode === "mobile" ? 800 : 900;
        buffer = await fetchFBScreenshot(url, api, width, height);
      } else {
        buffer = await fetchScreenshot(url, mode);
      }

      const durationMs = Date.now() - startedAt;

      if (!buffer || buffer.length < 1000) {
        throw new Error("Screenshot too small — site may block bots.");
      }

      /* Hostname */
      let hostname = url;
      try { hostname = new URL(url).hostname; } catch (_) {}

      /* Save .jpg */
      tmpPath = path.join(os.tmpdir(), `nexus_ss_${Date.now()}.jpg`);
      await fs.writeFile(tmpPath, buffer);

      const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
      const sizeKB = (buffer.length / 1024).toFixed(0);
      const sizeDisplay = buffer.length > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

      const caption =
        `📸 SCREENSHOT COMPLETE\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🌐 Site: ${hostname}\n` +
        `📐 Mode: ${modeLabel}\n` +
        (isFacebook ? `🍪 Cookies: Bot session used\n` : ``) +
        `📦 Size: ${sizeDisplay}\n` +
        `⚡ Time: ${(durationMs / 1000).toFixed(1)}s\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `✨ ${FOOTER} ✨`;

      /* React ✅ */
      if (messageID) await react(api, "✅", messageID, threadID);

      api.sendMessage({
        body: caption,
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[screenshot] error:", e.message);
      if (messageID) await react(api, "❌", messageID, threadID);

      let errorMsg = e.message;
      if (e.code === "ECONNABORTED" || /timeout/i.test(e.message)) {
        errorMsg = "Site took too long. Try again.";
      } else if (/ENOTFOUND|EAI_AGAIN/i.test(e.message)) {
        errorMsg = "Site not found.";
      }

      api.sendMessage(
        `❌ Screenshot failed: ${errorMsg}\n\n✨ ${FOOTER} ✨`,
        threadID
      );

      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    }
  }
};
// Powered by Shihab