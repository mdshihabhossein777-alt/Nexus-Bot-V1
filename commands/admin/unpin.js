module.exports = {
  name: "unpin", aliases: ["unpinmsg"], version: "1.0.0", role: 1,
  description: "Unpin a previously pinned message",
  usage: "/unpin  (reply to the pinned message)",
  execute: async function (api, event, args, db) {
    const { threadID, messageReply } = event;
    try {
      if (!messageReply) return api.sendMessage("📌 Reply to the pinned message to unpin.", threadID);

      // Try native unpin first
      if (typeof api.unpinMessage === "function") {
        try {
          await api.unpinMessage(messageReply.messageID, threadID);
          return api.sendMessage("📌 Message unpinned.", threadID);
        } catch (e) { /* fall through */ }
      }

      api.sendMessage(
        "⚠️ This bot version can't unpin natively.\n" +
        "Please long-press the pinned message in Messenger and choose 'Unpin'.",
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app