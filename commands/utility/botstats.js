/**
 * commands/utility/botstats.js
 * NEXUS BOT V1 — System + bot stats + cloud GIF
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const cloudStorage = require("../../utils/cloudStorage");

/* ═══ Cloud GIF name ═══ */
const GIF_NAME = "bot";

module.exports = {
  name: "botstats",
  aliases: ["bstats"],
  version: "2.0.0",
  role: 0,
  description: "System + bot stats",
  usage: "/botstats",
  category: "utility",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    react("⏳");

    let tmpPath = null;

    try {
      /* ═══ Calculate stats ═══ */
      const up = Date.now() - ((global.NEXUS && global.NEXUS.START_TIME) || Date.now());
      const d = Math.floor(up / 86400000);
      const h = Math.floor(up / 3600000) % 24;
      const m = Math.floor((up % 3600000) / 60000);

      const mem = process.memoryUsage();

      /* ═══ Build text — NO LINKS ═══ */
      const body =
        `📊 BOT STATS\n` +
        `────────────\n` +
        `🖥️ Platform   : ${os.platform()} ${os.arch()}\n` +
        `⚙️ CPU        : ${os.cpus().length} cores\n` +
        `💾 RAM        : ${(mem.rss / 1048576).toFixed(1)} MB\n` +
        `📦 Heap Used  : ${(mem.heapUsed / 1048576).toFixed(1)} MB\n` +
        `⏱️ Uptime     : ${d > 0 ? d + "d " : ""}${h}h ${m}m\n` +
        `🟢 Node.js    : ${process.version}\n` +
        `🤖 Commands   : ${(global.NEXUS && global.NEXUS.commands) ? global.NEXUS.commands.size : 0}\n` +
        `👥 Groups     : ${(global.NEXUS && global.NEXUS.groupsDB) ? Object.keys(global.NEXUS.groupsDB).length : 0}\n` +
        `👤 Users      : ${(global.NEXUS && global.NEXUS.usersDB) ? Object.keys(global.NEXUS.usersDB).length : 0}`;

      /* ═══ Load cloud GIF ═══ */
      let gifBuf = null;
      try {
        const ownerID = String(config.ownerID);
        gifBuf = await cloudStorage.getCloudFileBuffer(ownerID, GIF_NAME, { maxSize: 20 * 1024 * 1024 });
        if (gifBuf) {
          console.log(`[botstats] cloud GIF loaded: ${(gifBuf.length / 1024).toFixed(0)} KB`);
        } else {
          console.log(`[botstats] cloud GIF not found: ${GIF_NAME}`);
        }
      } catch (e) {
        console.log(`[botstats] cloud error: ${e.message.slice(0, 60)}`);
      }

      /* ═══ Send ═══ */
      if (gifBuf) {
        tmpPath = path.join(os.tmpdir(), `botstats_${Date.now()}.gif`);
        await fs.writeFile(tmpPath, gifBuf);

        api.sendMessage({
          body,
          attachment: fs.createReadStream(tmpPath)
        }, threadID, () => {
          try { fs.unlinkSync(tmpPath); } catch (_) {}
        });
      } else {
        api.sendMessage(body, threadID);
      }

      react("📊");

    } catch (e) {
      console.error("[botstats] error:", e.message);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
      react("❌");
      api.sendMessage("❌ " + e.message.slice(0, 60), threadID);
    }
  }
};

// © 2026 NEXUS BOT V1