module.exports = {
  name: "bank", version: "1.0.0", role: 0,
  description: "Show bank balance", usage: "/bank [@user]",
  execute: async function (api, event, args, db) {
    const { threadID, senderID, mentions, messageReply } = event;
    try {
      let target = String(senderID);
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);
      const u = await db.getUser(target);
      api.sendMessage(`🏦 BANK\n👤 ${target}\n💵 $${(u.bank||0).toLocaleString()}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app