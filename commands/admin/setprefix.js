module.exports = {
  name: "setprefix", version: "1.0.0", role: 1,
  description: "Set a custom prefix for this group",
  usage: "/setprefix !",
  execute: async function (api, event, args, db, config) {
    const { threadID, senderID } = event;
    try {
      const newPrefix = (args[0] || "").trim();
      if (!newPrefix) return api.sendMessage("📝 Usage: /setprefix <symbol>", threadID);
      if (newPrefix.length > 3) return api.sendMessage("⚠️ Prefix must be 1–3 characters.", threadID);
      const isOwner = String(senderID) === String(config.ownerID);
      if (!event.isGroup) {
        if (!isOwner) return api.sendMessage("⛔ Owner only in DMs.", threadID);
        config.prefix = newPrefix;
        return api.sendMessage(`✅ Global prefix set to "${newPrefix}" (session only).`, threadID);
      }
      const g = await db.getGroup(threadID);
      g.settings.prefix = newPrefix;
      await g.save();
      db.cache.set(`group_${threadID}`, g, 30);
      api.sendMessage(`✅ Group prefix set to "${newPrefix}"`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};