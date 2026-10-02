module.exports = {
  name: "antilink", version: "1.0.0", role: 1,
  description: "Toggle automatic link deletion in this group",
  usage: "/antilink on|off",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const g = await db.getGroup(threadID);
      const mode = (args[0] || "").toLowerCase();
      g.settings.antilink = mode ? mode === "on" || mode === "true" : !g.settings.antilink;
      await g.save();
      db.cache.set(`group_${threadID}`, g, 30);
      api.sendMessage(`🔗 AntiLink is now ${g.settings.antilink ? "ON ✅" : "OFF ❌"}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};