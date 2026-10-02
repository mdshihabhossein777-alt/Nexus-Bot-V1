module.exports = {
  name: "stats", aliases: ["statistics"], version: "1.0.0", role: 0,
  description: "Bot + DB statistics", usage: "/stats",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const userCount = await db.User.countDocuments();
      const groupCount = await db.Group.countDocuments();
      const up = Date.now() - global.NEXUS.START_TIME;
      const hours = (up / 3600000).toFixed(1);

      api.sendMessage(
        `📊 NEXUS STATS\n────────────\n` +
        `👥 Users: ${userCount}\n` +
        `👥 Groups: ${groupCount}\n` +
        `🤖 Commands: ${global.NEXUS.commands.size}\n` +
        `🔗 Auto-dl triggers: ${global.NEXUS.linkTriggers.length}\n` +
        `⏱️ Uptime: ${hours}h\n` +
        `💾 Memory: ${(process.memoryUsage().heapUsed / 1048576).toFixed(1)} MB\n` +
        `🟢 Node: ${process.version}`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app