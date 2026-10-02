module.exports = {
  name: "threadinfo", aliases: ["tinfo"], version: "1.0.0", role: 0,
  description: "Show thread info (works in DM too)", usage: "/threadinfo",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const info = await api.getThreadInfo(threadID);
      api.sendMessage(
        `📋 THREAD INFO\n────────────\n` +
        `🆔 TID: ${threadID}\n` +
        `📛 Name: ${info.threadName || "(DM)"}\n` +
        `👥 Members: ${info.participantIDs?.length || 2}\n` +
        `🛡️ Admins: ${info.adminIDs?.length || 0}\n` +
        `💬 Emoji: ${info.emoji || "N/A"}\n` +
        `📁 Type: ${event.isGroup ? "Group" : "DM"}`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app