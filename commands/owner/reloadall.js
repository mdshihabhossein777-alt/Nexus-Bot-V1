// commands/owner/reloadall.js - NEXUS V1 - Full reload with trigger rebuild
module.exports = {
  name: "reloadall",
  aliases: ["rall", "fullreload"],
  version: "1.0.0",
  role: 2,
  description: "OWNER: Full reload (commands + triggers + cache)",
  usage: "/reloadall",
  execute: async function (api, event, args, db, config) {
    const { threadID } = event;
    try {
      const NEXUS = global.NEXUS;
      if (!NEXUS) return api.sendMessage("❌ Global not ready.", threadID);

      /* Clear require cache for command files */
      const COMMANDS_DIR = require("path").join(__dirname, "..", "..", "commands");
      const fs = require("fs-extra");

      function clearCache(dir) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir);
        for (const name of entries) {
          const full = require("path").join(dir, name);
          const st = fs.statSync(full);
          if (st.isDirectory()) {
            clearCache(full);
          } else if (name.endsWith(".js")) {
            try {
              delete require.cache[require.resolve(full)];
            } catch (_) {}
          }
        }
      }

      clearCache(COMMANDS_DIR);

      /* Reload */
      const loaded = NEXUS.loadCommands();

      /* Clear node cache */
      try { NEXUS.cache.flushAll(); } catch (_) {}

      api.sendMessage(
        `⚡ FULL RELOAD COMPLETE\n` +
        `────────────\n` +
        `📦 Commands: ${loaded}\n` +
        `🔗 Triggers: ${NEXUS.linkTriggers.length}\n` +
        `💾 Cache cleared\n\n` +
        `💡 Everything fresh!`,
        threadID
      );

    } catch (e) {
      api.sendMessage("❌ Failed: " + e.message, threadID);
    }
  }
};
// Powered by Shihab