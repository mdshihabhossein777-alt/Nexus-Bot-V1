const os = require("os");
module.exports = {
  name: "botstats", aliases: ["bstats"], version: "1.0.0", role: 0,
  description: "System + bot stats", usage: "/botstats",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const up = Date.now() - global.NEXUS.START_TIME;
      const h = Math.floor(up / 3600000);
      const m = Math.floor((up % 3600000) / 60000);
      api.sendMessage(
        `📊 BOT STATS\n────────────\n` +
        `🖥️ Platform: ${os.platform()} ${os.arch()}\n` +
        `⚙️ CPU: ${os.cpus().length} cores\n` +
        `💾 RAM: ${(process.memoryUsage().rss / 1048576).toFixed(1)} MB\n` +
        `📦 Heap: ${(process.memoryUsage().heapUsed / 1048576).toFixed(1)} MB\n` +
        `⏱️ Uptime: ${h}h ${m}m\n` +
        `🟢 Node: ${process.version}\n` +
        `🤖 Commands: ${global.NEXUS.commands.size}`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app