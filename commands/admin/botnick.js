module.exports = {
  name: "botnick", aliases: ["nickme"], version: "1.0.0", role: 1,
  description: "Change the bot's own nickname in this group",
  usage: "/botnick <nickname>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const nick = args.join(" ").trim();
      if (!nick) return api.sendMessage("📝 Usage: /botnick <nickname>", threadID);
      if (nick.length > 32) return api.sendMessage("⚠️ Nickname max 32 chars.", threadID);

      const me = String(api.getCurrentUserID());
      await api.changeNickname(nick, threadID, me);
      api.sendMessage(`✅ Bot nickname changed to: ${nick}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app