// commands/owner/restart.js - NEXUS V1 - Restart bot (Render auto-restart)
module.exports = {
  name: "restart",
  aliases: ["reboot", "rs"],
  version: "2.0.0",
  role: 2,
  description: "OWNER: Restart bot (works on Render auto-restart)",
  usage: "/restart",
  execute: async function (api, event, args, db, config) {
    const { threadID } = event;
    try {
      const now = Date.now();
      if (now - (global._lastRestart || 0) < 60000) {
        const wait = Math.ceil((60000 - (now - global._lastRestart)) / 1000);
        return api.sendMessage(`⏳ Restart cooldown: ${wait}s`, threadID);
      }
      global._lastRestart = now;

      api.sendMessage(
        `🔄 RESTARTING...\n\n` +
        `💡 On Render, bot will auto-restart in 5-10s.\n` +
        `💡 Locally, use Ctrl+C then npm start.`,
        threadID,
        () => {
          setTimeout(() => process.exit(0), 1500);
        }
      );
    } catch (e) {
      api.sendMessage("Error: " + e.message, threadID);
    }
  }
};
// Powered by Shihab