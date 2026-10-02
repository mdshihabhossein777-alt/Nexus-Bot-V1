const LIMIT = 3;
module.exports = {
  name: "warn", version: "1.0.0", role: 1,
  description: "Warn a user (auto-kick at 3 warnings)",
  usage: "/warn @mention | reply",
  execute: async function (api, event, args, db) {
    const { threadID, mentions, messageReply } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const ids = Object.keys(mentions || {});
      if (messageReply && messageReply.senderID) ids.push(String(messageReply.senderID));
      if (!ids.length) return api.sendMessage("⚠️ Mention or reply to the user to warn.", threadID);
      const g = await db.getGroup(threadID);
      g.warnings = g.warnings || {};
      const out = [];
      for (const id of [...new Set(ids.map(String))]) {
        g.warnings[id] = (g.warnings[id] || 0) + 1;
        out.push(`⚠️ <@${id}> now has ${g.warnings[id]}/${LIMIT} warnings.`);
        if (g.warnings[id] >= LIMIT) {
          g.warnings[id] = 0;
          try { await api.removeUserFromGroup(id, threadID); out.push(`👢 <@${id}> auto-kicked.`); } catch (e) {}
        }
      }
      g.markModified("warnings");
      await g.save();
      db.cache.set(`group_${threadID}`, g, 30);
      api.sendMessage(out.join("\n"), threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};