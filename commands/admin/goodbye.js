module.exports = {
  name: "goodbye", version: "1.0.0", role: 1,
  description: "Toggle the goodbye message when a member leaves",
  usage: "/goodbye on|off",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const g = await db.getGroup(threadID);
      const mode = (args[0] || "").toLowerCase();
      g.settings.goodbye = mode ? mode === "on" || mode === "true" : !g.settings.goodbye;
      if (g.settings.goodbye) g.settings.leaveNoti = true;
      await g.save();
      db.cache.set(`group_${threadID}`, g, 30);
      api.sendMessage(`👋 Goodbye messages are now ${g.settings.goodbye ? "ON ✅" : "OFF ❌"}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};