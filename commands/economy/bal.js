module.exports = {
  name: "bal", version: "1.0.0", role: 0,
  description: "Alias of /balance",
  usage: "/bal [@user]",
  execute: async function (api, event, args, db) {
    const { threadID, senderID } = event;
    try {
      const u = await db.getUser(senderID);
      api.sendMessage(`💰 Wallet: $${(u.balance||0).toLocaleString()} | 🏦 Bank: $${(u.bank||0).toLocaleString()}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app