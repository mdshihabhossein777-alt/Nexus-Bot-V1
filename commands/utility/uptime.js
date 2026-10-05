/**
 * commands/utility/uptime.js
 * NEXUS BOT V1 — Uptime with cloud GIF
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const cloudStorage = require("../../utils/cloudStorage");

/* ═══ Cloud GIF name ═══ */
const GIF_NAME = "upt";

module.exports = {
  name: "uptime",
  aliases: ["runtime", "upt", "up"],
  version: "4.0.0",
  role: 0,
  description: "Show bot uptime with fake PC specs + cloud GIF",
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
        `📊 CPU Usage  : 32%\n` +
        `📊 GPU Usage  : 10%\n` +
        `🌐 Network    : 10 Gbps Fiber\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🚀 NEXUS BOT V1`;

      /* ═══ Load cloud GIF ═══ */
      let gifBuf = null;
      try {
        const ownerID = String(config.ownerID);
        gifBuf = await cloudStorage.getCloudFileBuffer(ownerID, GIF_NAME, { maxSize: 20 * 1024 * 1024 });
        if (gifBuf) {
          console.log(`[upt] cloud GIF loaded: ${(gifBuf.length / 1024).toFixed(0)} KB`);
        } else {
          console.log(`[upt] cloud GIF not found: ${GIF_NAME}`);
        }
      } catch (e) {
        console.log(`[upt] cloud error: ${e.message.slice(0, 60)}`);
      }

      /* ═══ Send ═══ */
      if (gifBuf) {
        tmpPath = path.join(os.tmpdir(), `upt_${Date.now()}.gif`);
        await fs.writeFile(tmpPath, gifBuf);

        api.sendMessage({
          body,
          attachment: fs.createReadStream(tmpPath)
        }, threadID, () => {
          try { fs.unlinkSync(tmpPath); } catch (_) {}
        });
      } else {
        /* Text only fallback */
        api.sendMessage(body, threadID);
      }

      react("✅");

    } catch (e) {
      console.error("[uptime] error:", e.message);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1