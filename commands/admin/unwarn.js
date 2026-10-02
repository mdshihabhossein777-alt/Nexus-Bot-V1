module.exports = {
  name: "unwarn", version: "1.0.0", role: 1,
  description: "Remove one warning from a user",
  usage: "/unwarn @mention | reply",
  execute: async function (api, event, args, db) {
    const { threadID, mentions, messageReply } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const ids = Object.keys(mentions || {});
      if (messageReply && messageReply.senderID) ids.push(String(messageReply.senderID));
      if (!ids.length) return api.sendMessage("⚠️ Mention or reply to the user.", threadID);
      const g = await db.getGroup(threadID);
      g.warnings = g.warnings || {};
      const out = [];
      for (const id of [...new Set(ids.map(String))]) {
        if (!g.warnings[id]) { out.push(`ℹ️ <@${id}> has no warnings.`); continue; }
        g.warnings[id] -= 1;
        if (g.warnings[id] <= 0) delete g.warnings[id];
        out.push(`✅ <@${id}> now has ${g.warnings[id] || 0} warning(s).`);
      }
      g.markModified("warnings");
      await g.save();
      db.cache.set(`group_${threadID}`, g, 30);
      api.sendMessage(out.join("\n"), threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};