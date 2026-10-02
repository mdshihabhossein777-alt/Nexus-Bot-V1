module.exports = {
  name: "setrules", version: "1.0.0", role: 1,
  description: "Set the group rules text",
  usage: "/setrules 1. Be kind  2. No spam",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const text = args.join(" ").trim();
      if (!text) return api.sendMessage("📝 Usage: /setrules <rules text>", threadID);
      const g = await db.getGroup(threadID);
      g.settings.rules = text;
      await g.save();
      db.cache.set(`group_${threadID}`, g, 30);
      api.sendMessage("✅ Group rules updated.", threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};