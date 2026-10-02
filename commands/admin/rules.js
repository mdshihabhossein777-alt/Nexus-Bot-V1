module.exports = {
  name: "rules", version: "1.0.0", role: 0,
  description: "Show the rules of this group",
  usage: "/rules",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const g = await db.getGroup(threadID);
      if (!g.settings.rules) return api.sendMessage("📜 No rules set. Admins can use /setrules <text>", threadID);
      api.sendMessage(`📜 GROUP RULES\n────────────\n${g.settings.rules}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};