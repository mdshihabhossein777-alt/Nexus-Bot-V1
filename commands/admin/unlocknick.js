module.exports = {
  name: "unlocknick", aliases: ["nickunlock"], version: "1.0.0", role: 1,
  description: "Release a user's locked nickname",
  usage: "/unlocknick @user",
  execute: async function (api, event, args, db) {
    const { threadID, mentions, messageReply } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);

      let target = null;
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);
      if (!target) return api.sendMessage("🔓 Usage: /unlocknick @user", threadID);

      const g = await db.getGroup(threadID);
      if (g.settings.lockedNicks && g.settings.lockedNicks[target]) {
        delete g.settings.lockedNicks[target];
        g.markModified("settings");
        await g.save();
        db.cache.set(`group_${threadID}`, g, 30);
        return api.sendMessage(`🔓 Unlocked <@${target}>'s nickname.`, threadID);
      }
      api.sendMessage(`ℹ️ <@${target}> doesn't have a locked nickname.`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app