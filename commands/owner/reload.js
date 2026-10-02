// commands/owner/reload.js - NEXUS V1 - Reload all commands without restart
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  name: "reload",
  aliases: ["rl", "refresh"],
  version: "2.0.0",
  role: 2,
  description: "OWNER: Reload all commands without restarting bot",
  usage: "/reload",
  execute: async function (api, event, args, db, config) {
    const { threadID } = event;
    try {
      /* Get reference to loader */
      const NEXUS = global.NEXUS;
      if (!NEXUS || typeof NEXUS.loadCommands !== "function") {
        return api.sendMessage("❌ Loader not available.", threadID);
      }

      const before = NEXUS.commands.size;

      /* Reload commands */
      const loaded = NEXUS.loadCommands();

      const after = NEXUS.commands.size;

      api.sendMessage(
        `✅ COMMANDS RELOADED\n` +
        `────────────\n` +
        `📦 Loaded: ${loaded} commands\n` +
        `🎯 Total registered: ${after}\n` +
        `🔗 Triggers: ${NEXUS.linkTriggers.length}\n\n` +
        `💡 No restart needed!`,
        threadID
      );

    } catch (e) {
      api.sendMessage("❌ Reload failed: " + e.message, threadID);
    }
  }
};
// Powered by Shihab