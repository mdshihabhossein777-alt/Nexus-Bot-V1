/**
 * commands/utility/screenshot.js
 * NEXUS BOT V1 — Website screenshot (multi-provider, reply support)
 * © 2026
 */

"use strict";

const axios = require("axios");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

/* ═══════════════════════════════════════════════════════════════
   REACTION HELPER
   ═══════════════════════════════════════════════════════════════ */
function react(api, emoji, messageID, threadID) {
  return new Promise((resolve) => {
    if (!messageID || !threadID) return resolve(false);
    const timer = setTimeout(() => resolve(false), 5000);
    try {
      api.setMessageReaction(emoji, messageID, threadID, (err) => {
        clearTimeout(timer);
        resolve(!err);
      });
    } catch (_) { clearTimeout(timer); resolve(false); }
  });
}

/* ═══════════════════════════════════════════════════════════════
   URL EXTRACTOR
   ═══════════════════════════════════════════════════════════════ */
function extractURL(text) {
  if (!text) return null;
  const m = String(text).match(/https?:\/\/[^\s]+/i);
  if (!m) return null;
  return m[0].replace(/[),.;:!?]+$/, "");
}

/* ═══════════════════════════════════════════════════════════════
   PROVIDER 1: microlink.io (best quality)
   ═══════════════════════════════════════════════════════════════ */
async function tryMicrolink(url, mode) {
  const params = {
    url: url,
    screenshot: "true",
    meta: "false",
    embed: "screenshot.url",
    waitUntil: "networkidle0"
  };

  if (mode === "mobile" || mode === "m") {
    params.viewport = "width=400,height=800,deviceScaleFactor=2,isMobile=true";
    params.fullPage = "false";
  } else if (mode === "tablet" || mode === "t") {
    params.viewport = "width=800,height=1000,deviceScaleFactor=2,isMobile=true";
    params.fullPage = "false";
  } else if (mode === "full" || mode === "f") {
    params.fullPage = "true";
    params.viewport = "width=1200,height=900";
  } else {
    params.viewport = "width=1200,height=900";
    params.fullPage = "false";
  }

  const r = await axios.get("https://api.microlink.io/", {
    params,
    responseType: "arraybuffer",
    timeout: 45000,
    maxContentLength: 30 * 1024 * 1024,
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const buf = Buffer.from(r.data);
  if (buf.length < 5000) throw new Error("microlink too small");

  /* Check magic bytes — JPG/PNG */
  const isJPG = buf[0] === 0xFF && buf[1] === 0xD8;
  const isPNG = buf[0] === 0x89 && buf[1] === 0x50;
  if (!isJPG && !isPNG) throw new Error("microlink invalid image");

  console.log("[sc] ✅ microlink");
  return buf;
}

/* ═══════════════════════════════════════════════════════════════
   PROVIDER 2: thum.io (fallback)
   ═══════════════════════════════════════════════════════════════ */
async function tryThumIO(url, mode) {
  let shotUrl;
  if (mode === "mobile" || mode === "m") {
    shotUrl = `https://image.thum.io/get/width/400/crop/800/allowJPG/viewportWidth/400/${url}`;
  } else if (mode === "tablet" || mode === "t") {
    shotUrl = `https://image.thum.io/get/width/800/crop/1000/allowJPG/viewportWidth/800/${url}`;
  } else if (mode === "full" || mode === "f") {
    shotUrl = `https://image.thum.io/get/width/1200/allowJPG/noanimate/${url}`;
  } else {
    shotUrl = `https://image.thum.io/get/width/1200/crop/900/allowJPG/${url}`;
  }

  const r = await axios.get(shotUrl, {
    responseType: "arraybuffer",
    timeout: 45000,
    maxContentLength: 30 * 1024 * 1024,
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const buf = Buffer.from(r.data);
  if (buf.length < 5000) throw new Error("thum.io too small");

  const isJPG = buf[0] === 0xFF && buf[1] === 0xD8;
  const isPNG = buf[0] === 0x89 && buf[1] === 0x50;
  if (!isJPG && !isPNG) throw new Error("thum.io invalid");

  console.log("[sc] ✅ thum.io");
  return buf;
}

/* ═══════════════════════════════════════════════════════════════
   PROVIDER 3: WordPress mShots (free, reliable)
   ═══════════════════════════════════════════════════════════════ */
async function tryMShots(url, mode) {
  const dims = (mode === "mobile" || mode === "m")
    ? "400x800"
    : (mode === "tablet" || mode === "t")
    ? "800x1000"
    : "1200x900";

  const shotUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=${dims.split("x")[0]}&h=${dims.split("x")[1]}`;

  /* mShots needs 2 requests — first to trigger, second to fetch */
  try {
    await axios.get(shotUrl, { timeout: 30000, headers: { "User-Agent": "Mozilla/5.0" } });
  } catch (_) {}

  /* Wait for processing */
  await new Promise((r) => setTimeout(r, 3000));

  const r = await axios.get(shotUrl, {
    responseType: "arraybuffer",
    timeout: 45000,
    maxContentLength: 30 * 1024 * 1024,
    headers: { "User-Agent": "Mozilla/5.0" },
    maxRedirects: 5
  });

  const buf = Buffer.from(r.data);
  if (buf.length < 5000) throw new Error("mshots too small");

  const isJPG = buf[0] === 0xFF && buf[1] === 0xD8;
  const isPNG = buf[0] === 0x89 && buf[1] === 0x50;
  if (!isJPG && !isPNG) throw new Error("mshots invalid");

  console.log("[sc] ✅ mShots");
  return buf;
}

/* ═══════════════════════════════════════════════════════════════
   MASTER FETCH — multi-provider
   ═══════════════════════════════════════════════════════════════ */
async function fetchScreenshot(url, mode) {
  const providers = [
    { name: "microlink", fn: () => tryMicrolink(url, mode) },
    { name: "thum.io",   fn: () => tryThumIO(url, mode) },
    { name: "mshots",    fn: () => tryMShots(url, mode) }
  ];

  let lastErr = null;

  for (const p of providers) {
    try {
      console.log(`[sc] trying: ${p.name}`);
      const buf = await p.fn();
      if (buf && buf.length > 5000) return buf;
    } catch (e) {
      console.log(`[sc] ❌ ${p.name}: ${e.message.slice(0, 60)}`);
      lastErr = e;
      continue;
    }
  }

  throw lastErr || new Error("all providers failed");
}

/* ═══════════════════════════════════════════════════════════════
   MAIN MODULE
   ═══════════════════════════════════════════════════════════════ */
module.exports = {
  name: "screenshot",
  aliases: ["sc", "ss", "ss2", "webshot", "snap", "xsc"],
  version: "4.0.0",
  role: 0,
  description: "Take screenshot of any website (multi-provider + reply)",
  usage: "/screenshot <url> [mobile|tablet|full] OR reply to URL with Xsc",
  category: "utility",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, body, messageReply } = event;

    let tmpPath = null;

    try {
      /* ═══ Extract URL — args OR reply ═══ */
      let url = null;
      let mode = "desktop";

      /* 1. Try args first */
      if (args && args.length) {
        const firstArg = String(args[0]).trim();
        /* Check if first arg looks like URL */
        if (/^https?:\/\//i.test(firstArg) || /^[\w-]+\.[\w-]+/i.test(firstArg)) {
          url = firstArg;
          if (args[1]) mode = String(args[1]).toLowerCase();
        } else {
          /* First arg not URL — maybe it's mode */
          if (["mobile", "m", "tablet", "t", "full", "f"].includes(firstArg.toLowerCase())) {
            mode = firstArg.toLowerCase();
          }
        }
      }

      /* 2. Try reply message body */
      if (!url && messageReply && messageReply.body) {
        url = extractURL(messageReply.body);
      }

      /* 3. Try current message body */
      if (!url && body) {
        url = extractURL(body);
      }

      /* ═══ No URL → help ═══ */
      if (!url) {
        if (messageID) await react(api, "❓", messageID, threadID);
        return api.sendMessage(
          "📸 SCREENSHOT\n" +
          "━━━━━━━━━━━━━━━━━━━━\n" +
          "📌 Usage:\n" +
          "• /sc <url>              → Desktop\n" +
          "• /sc <url> mobile       → Mobile\n" +
          "• /sc <url> tablet       → Tablet\n" +
          "• /sc <url> full         → Full page\n" +
          "• Reply to URL + /sc     → Auto-detect\n" +
          "• Reply to URL + Xsc     → Short form",
          threadID
        );
      }

      /* ═══ Auto prefix https ═══ */
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;

      /* ═══ Validate URL ═══ */
      try {
        new URL(url);
      } catch (_) {
        if (messageID) await react(api, "❌", messageID, threadID);
        return;
      }

      /* ═══ Mode label ═══ */
      let modeLabel = "🖥️ Desktop (1200×900)";
      if (mode === "mobile" || mode === "m") modeLabel = "📱 Mobile (400×800)";
      else if (mode === "tablet" || mode === "t") modeLabel = "📱 Tablet (800×1000)";
      else if (mode === "full" || mode === "f") modeLabel = "📄 Full Page";

      /* ═══ React ⏳ ═══ */
      if (messageID) await react(api, "⏳", messageID, threadID);

      /* ═══ Fetch screenshot ═══ */
      const startedAt = Date.now();
      const buffer = await fetchScreenshot(url, mode);
      const durationMs = Date.now() - startedAt;

      if (!buffer || buffer.length < 5000) {
        throw new Error("screenshot too small");
      }

      /* ═══ Hostname ═══ */
      let hostname = url;
      try { hostname = new URL(url).hostname; } catch (_) {}

      /* ═══ Save as proper image file ═══ */
      let ext = ".jpg";
      if (buffer[0] === 0x89 && buffer[1] === 0x50) ext = ".png";

      tmpPath = path.join(os.tmpdir(), `nexus_sc_${Date.now()}${ext}`);
      await fs.writeFile(tmpPath, buffer);

      const sizeKB = (buffer.length / 1024).toFixed(0);
      const sizeDisplay = buffer.length > 1024 * 1024
        ? `${(buffer.length / 1024 / 1024).toFixed(2)} MB`
        : `${sizeKB} KB`;

      /* ═══ Caption ═══ */
      const caption =
        `📸 SCREENSHOT COMPLETE\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🌐 Site: ${hostname}\n` +
        `📐 Mode: ${modeLabel}\n` +
        `📦 Size: ${sizeDisplay}\n` +
        `⚡ Time: ${(durationMs / 1000).toFixed(1)}s`;

      /* ═══ Send ═══ */
      api.sendMessage({
        body: caption,
        attachment: fs.createReadStream(tmpPath)
      }, threadID, (err) => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
        if (err) {
          console.log("[sc] send err:", err.message);
          if (messageID) react(api, "❌", messageID, threadID);
        } else {
          if (messageID) react(api, "✅", messageID, threadID);
        }
      });

    } catch (e) {
      console.log("[sc] error:", e.message);
      if (messageID) await react(api, "❌", messageID, threadID);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
      /* Silent — no error message */
    }
  }
};

// © 2026 NEXUS BOT V1