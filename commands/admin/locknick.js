module.exports = {
  name: "locknick", aliases: ["nicklock"], version: "1.0.0", role: 1,
  description: "Freeze a user's nickname to a fixed value",
  usage: "/locknick @user <nickname>",
  execute: async function (api, event, args, db) {
    const { threadID, mentions, messageReply } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);

      let target = null;
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);
      if (!target) return api.sendMessage("🔒 Usage: /locknick @user <nickname>", threadID);

      // Nickname is the args joined, excluding any @mention token
      const nick = args.filter((a) => !a.startsWith("@")).join(" ").trim();
      if (!nick) return api.sendMessage("📝 Please provide a nickname.", threadID);
      if (nick.length > 32) return api.sendMessage("⚠️ Nickname max 32 chars.", threadID);

      await api.changeNickname(nick, threadID, target);

      const g = await db.getGroup(threadID);
      g.settings.lockedNicks = g.settings.lockedNicks || {};
      g.settings.lockedNicks[target] = nick;
      g.markModified("settings");
      await g.save();
      db.cache.set(`group_${threadID}`, g, 30);

      api.sendMessage(`🔒 Locked <@${target}>'s nickname to: ${nick}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app