module.exports = {
  name: "prefix", version: "1.0.0", role: 0,
  description: "Show the active prefix for this chat",
  usage: "/prefix",
  execute: async function (api, event, args, db, config) {
    const { threadID } = event;
    try {
      let prefix = config.prefix;
      if (event.isGroup) {
        const g = await db.getGroup(threadID);
        if (g.settings.prefix) prefix = g.settings.prefix;
      }
      api.sendMessage(`🔧 Current prefix: "${prefix}"\nExample: ${prefix}help`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};