const moment = require("moment-timezone");
module.exports = {
  name: "time", aliases: ["clock"], version: "1.0.0", role: 0,
  description: "Show time in any timezone", usage: "/time [timezone]",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const tz = args[0] || "Asia/Dhaka";
      if (!moment.tz.zone(tz)) {
        return api.sendMessage(
          `⚠️ Unknown timezone.\nTry: Asia/Dhaka, Asia/Kolkata, America/New_York, Europe/London, Asia/Tokyo`,
          threadID
        );
      }
      const now = moment().tz(tz);
      api.sendMessage(
        `🕐 TIME — ${tz}\n────────────\n` +
        `📅 ${now.format("dddd, MMMM D, YYYY")}\n` +
        `⏰ ${now.format("HH:mm:ss")}\n` +
        `🌍 UTC Offset: ${now.format("Z")}`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app