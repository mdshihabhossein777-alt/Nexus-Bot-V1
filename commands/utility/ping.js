module.exports = {
  name: "ping", version: "1.0.0", role: 0,
  description: "Check bot latency",
  usage: "/ping",
  execute: async function (api, event, args, db, config) {
    const { threadID } = event;
    const t = Date.now();
    api.sendMessage("🏓 Pong!", threadID, () => {
      const ms = Date.now() - t;
      // Follow-up sent after first message → footer auto-applied
      setTimeout(() => {
        api.sendMessage(
          `📡 Latency: ${ms}ms\n` +
          `⏱️ Uptime: ${Math.floor((Date.now() - global.NEXUS.START_TIME) / 1000)}s\n` +
          `🤖 Commands loaded: ${global.NEXUS.commands.size}\n` +
          `🔗 Auto-dl triggers: ${global.NEXUS.linkTriggers.length}`,
          threadID
        );
      }, 500);
    });
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app