module.exports = {
  name: "pin", version: "1.0.0", role: 1,
  description: "Pin a replied-to message (falls back to an announcement if unsupported)",
  usage: "/pin  (reply to a message)",
  execute: async function (api, event, args, db) {
    const { threadID, messageReply } = event;
    try {
      if (!messageReply) return api.sendMessage("📌 Reply to the message you want to pin.", threadID);
      if (typeof api.pinMessage === "function") {
        try {
          await api.pinMessage(messageReply.messageID, threadID, true);
          return api.sendMessage("📌 Message pinned.", threadID);
        } catch (e) {}
      }
      const body = messageReply.body || "(attachment)";
      let author = messageReply.senderID || "unknown";
      try {
        const u = await api.getUserInfo(String(author));
        if (u && u[author] && u[author].name) author = u[author].name;
      } catch (e) {}
      api.sendMessage(`📌 PINNED ANNOUNCEMENT\n────────────\nFrom: ${author}\n\n${body}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};