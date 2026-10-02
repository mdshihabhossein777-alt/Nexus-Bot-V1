module.exports = {
  name: "antispam", version: "1.0.0", role: 1,
  description: "Toggle spam protection (5 msgs / 5s limit)",
  usage: "/antispam on|off",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const g = await db.getGroup(threadID);
      const mode = (args[0] || "").toLowerCase();
      g.settings.antispam = mode ? mode === "on" || mode === "true" : !g.settings.antispam;
      await g.save();
      db.cache.set(`group_${threadID}`, g, 30);
      api.sendMessage(`🛑 AntiSpam is now ${g.settings.antispam ? "ON ✅" : "OFF ❌"}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};