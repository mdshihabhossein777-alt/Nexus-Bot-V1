module.exports = {
  name: "groupinfo", aliases: ["ginfo"], version: "1.0.0", role: 0,
  description: "Show info about this group", usage: "/groupinfo",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const info = await api.getThreadInfo(threadID);
      const g = await db.getGroup(threadID);
      api.sendMessage(
        `👥 GROUP INFO\n────────────\n` +
        `📛 Name: ${info.threadName || "N/A"}\n` +
        `🆔 TID: ${threadID}\n` +
        `👤 Members: ${info.participantIDs?.length || 0}\n` +
        `🛡️ Admins: ${info.adminIDs?.length || 0}\n` +
        `🤖 Bot Admin: ${info.adminIDs?.some((a) => String(a.id || a) === String(api.getCurrentUserID())) ? "✅ Yes" : "❌ No"}\n` +
        `💬 Emoji: ${info.emoji || "N/A"}\n` +
        `📊 Bot Commands Used Here: ${g.cmdCount || 0}\n` +
        `📅 Group Created: ${info.threadType || "unknown"}`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app