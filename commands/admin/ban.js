module.exports = {
  name: "ban",
  version: "1.0.0",
  role: 1,
  description: "Ban a user — auto-kicked whenever they speak again",
  usage: "/ban @mention | reply",
  execute: async function (api, event, args, db) {
    const { threadID, mentions, messageReply } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const ids = Object.keys(mentions || {});
      if (messageReply && messageReply.senderID) ids.push(String(messageReply.senderID));
      if (!ids.length) return api.sendMessage("⚠️ Mention or reply to the user to ban.", threadID);
      const g = await db.getGroup(threadID);
      let count = 0;
      for (const id of [...new Set(ids.map(String))]) {
        if (!g.banned.includes(id)) { g.banned.push(id); count++; }
        try { await api.removeUserFromGroup(id, threadID); } catch (e) {}
      }
      await g.save();
      db.cache.set(`group_${threadID}`, g, 30);
      api.sendMessage(`🚫 Banned ${count} user(s).`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};