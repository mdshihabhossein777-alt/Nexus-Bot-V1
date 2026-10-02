module.exports = {
  name: "votekick", version: "1.0.0", role: 0,
  description: "Start a 30-second vote to kick a user (reply with yes/no)",
  usage: "/votekick @mention | reply",
  execute: async function (api, event, args, db) {
    const { threadID, mentions, messageReply, senderID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      let target = null;
      if (messageReply && messageReply.senderID) target = String(messageReply.senderID);
      else {
        const ids = Object.keys(mentions || {});
        if (ids.length) target = String(ids[0]);
      }
      if (!target) return api.sendMessage("🗳️ Reply to, or mention, the user you want to vote-kick.", threadID);
      if (target === String(api.getCurrentUserID())) return api.sendMessage("🙃 I can't be vote-kicked.", threadID);
      const info = await api.sendMessage(
        `🗳️ VOTE KICK\n────────────\nTarget: @${target}\nDuration: 30 seconds\n\nReply with "yes" or "no".`,
        threadID
      );
      const messageID = info && info.messageID;
      if (!messageID) return;
      db.votes.set(messageID, {
        threadID, target, yes: [], no: [],
        initiator: String(senderID),
        endsAt: Date.now() + 30000
      });
      setTimeout(async () => {
        const v = db.votes.get(messageID);
        if (!v) return;
        db.votes.delete(messageID);
        const yes = v.yes.length, no = v.no.length;
        if (yes > no && yes > 0) {
          try {
            await api.removeUserFromGroup(v.target, threadID);
            api.sendMessage(`✅ Vote passed (Yes ${yes} / No ${no}). User removed.`, threadID);
          } catch (e) {
            api.sendMessage(`⚠️ Vote passed but removal failed: ${e.message}`, threadID);
          }
        } else {
          api.sendMessage(`❌ Vote failed (Yes ${yes} / No ${no}). User stays.`, threadID);
        }
      }, 31000);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};