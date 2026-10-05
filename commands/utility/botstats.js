/**
 * commands/utility/botstats.js
 * NEXUS BOT V1 — Bot stats with local GIF
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const assets = require("../../utils/assets");

const GIF_NAME = "botinfo.gif";

module.exports = {
  name: "botstats",
  aliases: ["bstats", "botinfo"],
  version: "3.0.0",
  role: 0,
  description: "System + bot stats with GIF",
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
      const up = Date.now() - ((global.NEXUS && global.NEXUS.START_TIME) || Date.now());
      const d = Math.floor(up / 86400000);
      const h = Math.floor(up / 3600000) % 24;
      const m = Math.floor((up % 3600000) / 60000);

      const mem = process.memoryUsage();

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

      /* Load GIF */
      const gifBuf = await assets.loadAsset(GIF_NAME);

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
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1