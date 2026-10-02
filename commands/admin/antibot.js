module.exports = {
  name: "antibot", version: "1.0.0", role: 1,
  description: "Toggle automatic deletion of other-bot command messages",
  usage: "/antibot on|off",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const g = await db.getGroup(threadID);
      const mode = (args[0] || "").toLowerCase();
      g.settings.antibot = mode ? mode === "on" || mode === "true" : !g.settings.antibot;
      await g.save();
      db.cache.set(`group_${threadID}`, g, 30);
      api.sendMessage(`🤖 AntiBot is now ${g.settings.antibot ? "ON ✅" : "OFF ❌"}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};