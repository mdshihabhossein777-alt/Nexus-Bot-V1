module.exports = {
  name: "kick",
  version: "1.0.0",
  role: 1,
  description: "Remove a mentioned or replied-to user from the group",
  usage: "/kick @mention | reply",
  execute: async function (api, event, args, db) {
    const { threadID, mentions, messageReply } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ This command only works in groups.", threadID);
      const ids = Object.keys(mentions || {});
      if (messageReply && messageReply.senderID) ids.push(String(messageReply.senderID));
      if (!ids.length) return api.sendMessage("⚠️ Mention or reply to the user you want to kick.", threadID);
      const me = String(api.getCurrentUserID());
      let done = 0;
      for (const id of [...new Set(ids.map(String))]) {
        if (id === me) { await api.sendMessage("🙃 I can't kick myself.", threadID); continue; }
        try { await api.removeUserFromGroup(id, threadID); done++; }
        catch (e) { await api.sendMessage(`❌ Could not kick ${id}: ${e.message}`, threadID); }
      }
      api.sendMessage(`✅ Kicked ${done} user(s).`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};