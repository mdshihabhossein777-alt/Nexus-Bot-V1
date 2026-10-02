const fs = require("fs-extra");
const path = require("path");

module.exports = {
  name: "delcmd",
  aliases: ["rmcmd"],
  version: "1.0.0",
  role: 2,
  description: "Custom command delete koro",
  usage: "/delcmd <name>",
  execute: async function (api, event, args) {
    const { threadID } = event;
    try {
      const name = (args[0] || "").toLowerCase();
      if (!name) return api.sendMessage(`📝 /delcmd <name>`, threadID);

      const filePath = path.join(__dirname, "..", "custom", `${name}.js`);
      if (!fs.existsSync(filePath)) return api.sendMessage(`❌ "${name}" nei.`, threadID);

      fs.unlinkSync(filePath);
      try { if (global.NEXUS && global.NEXUS.loadCommands) global.NEXUS.loadCommands(); } catch (_) {}

      api.sendMessage(`🗑️ Deleted: ${name}.js`, threadID);
    } catch (e) {
      api.sendMessage("❌ " + e.message, threadID);
    }
  }
};