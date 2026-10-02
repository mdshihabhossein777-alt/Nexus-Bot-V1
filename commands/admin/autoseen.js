module.exports = {
  name: "autoseen", aliases: ["seen"], version: "1.0.0", role: 1,
  description: "Toggle automatic seen (mark-as-read) in this group",
  usage: "/autoseen on|off",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const g = await db.getGroup(threadID);
      const mode = (args[0] || "").toLowerCase();
      g.settings.autoseen = mode ? mode === "on" || mode === "true" : !g.settings.autoseen;
      await g.save();
      db.cache.set(`group_${threadID}`, g, 30);
      api.sendMessage(`👁️ AutoSeen is now ${g.settings.autoseen ? "ON ✅" : "OFF ❌"}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};