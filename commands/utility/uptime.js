/**
 * commands/utility/uptime.js
 * NEXUS BOT V1 — Uptime with fake PC specs + animated GIF
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══ Fetch animated GIF from multiple sources ═══ */
async function fetchAnimatedGIF() {
  const gifUrls = [
    "https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif",
    "https://media.giphy.com/media/077i6AULCXc0FKTj9s/giphy.gif",
    "https://media.giphy.com/media/dxn6fRlTIShoeBr69N/giphy.gif",
    "https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif",
    "https://media.tenor.com/2KyVW1Hlxb8AAAAC/hacker-hack.gif",
    "https://media.tenor.com/On7kvXhzml4AAAAj/loading-gif.gif",
    "https://media.tenor.com/9vRAkntogEMAAAAd/matrix-cyber.gif",
  ];

  /* Shuffle */
  const shuffled = [...gifUrls].sort(() => Math.random() - 0.5);

  for (const url of shuffled) {
    try {
      const r = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 12000,
        maxContentLength: 25 * 1024 * 1024,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "image/gif,image/*,*/*"
        }
      });

      const buf = Buffer.from(r.data);

      /* ⚡ Verify it's a real GIF */
      const isGIF87a = buf.slice(0, 6).toString() === "GIF87a";
      const isGIF89a = buf.slice(0, 6).toString() === "GIF89a";

      if (buf.length > 5000 && (isGIF87a || isGIF89a)) {
        console.log(`[upt] got GIF: ${buf.length} bytes from ${url.slice(0, 50)}`);
        return buf;
      }
    } catch (e) {
      console.log(`[upt] failed ${url.slice(0, 40)}: ${e.message.slice(0, 40)}`);
      continue;
    }
  }
  return null;
}

/* ═══ Main command ═══ */
module.exports = {
  name: "uptime",
  aliases: ["runtime", "upt", "up"],
  version: "2.0.0",
  role: 0,
  description: "Show bot uptime with fake high-end PC specs + GIF",
  usage: "/uptime  or  /upt",
  category: "utility",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    react("⏳");

    let tmpPath = null;

    try {
      /* ═══ Uptime calculate ═══ */
      const start = (global.NEXUS && global.NEXUS.START_TIME) || Date.now();
      const s = Math.floor((Date.now() - start) / 1000);

      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;

      const parts = [];
      if (d > 0) parts.push(`${d}d`);
      if (h > 0) parts.push(`${h}h`);
      if (m > 0) parts.push(`${m}m`);
      parts.push(`${sec}s`);
      const uptimeStr = parts.join(" ");

      /* ═══ Fake PC specs message ═══ */
      const body =
        `⚡ SYSTEM INFO ⚡\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⏱️ Uptime     : ${uptimeStr}\n` +
        `🖥️ CPU        : Intel Core i9-14900KS @ 6.2GHz\n` +
        `🎮 GPU        : NVIDIA RTX 5090 24GB GDDR7\n` +
        `💾 RAM        : 128GB DDR5 7200MHz\n` +
        `💿 Storage    : 4TB NVMe Gen5 SSD\n` +
        `🔌 PSU        : 1600W 80+ Titanium\n` +
        `❄️ Cooling    : Custom Liquid Cooling\n` +
        `🪟 OS         : Windows 11 Pro (25H2)\n` +
        `📊 CPU Usage  : 42%\n` +
        `📊 GPU Usage  : 38%\n` +
        `🌐 Network    : 10 Gbps Fiber\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🚀 NEXUS BOT V1`;

      /* ═══ Fetch animated GIF ═══ */
      const gifBuf = await fetchAnimatedGIF();

      if (gifBuf) {
        tmpPath = path.join(os.tmpdir(), `upt_${Date.now()}.gif`);
        await fs.writeFile(tmpPath, gifBuf);

        api.sendMessage({
          body,
          attachment: fs.createReadStream(tmpPath)
        }, threadID, () => {
          try { fs.unlinkSync(tmpPath); } catch (_) {}
        });

        react("✅");
      } else {
        /* Fallback: text only */
        react("✅");
        api.sendMessage(body, threadID);
      }

    } catch (e) {
      console.error("[uptime] error:", e.message);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1