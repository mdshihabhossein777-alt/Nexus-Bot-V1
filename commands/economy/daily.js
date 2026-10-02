const REWARD = 500, COOLDOWN = 24*60*60*1000;
module.exports = {
  name: "daily", version: "1.0.0", role: 0,
  description: "Claim daily reward (every 24h)", usage: "/daily",
  execute: async function (api, event, args, db) {
    const { threadID, senderID } = event;
    try {
      const u = await db.getUser(senderID);
      const now = Date.now();
      const last = u.dailyClaim ? new Date(u.dailyClaim).getTime() : 0;
      if (now - last < COOLDOWN) {
        const r = COOLDOWN - (now - last);
        return api.sendMessage(`⏳ Already claimed. Come back in ${Math.floor(r/3600000)}h ${Math.floor((r%3600000)/60000)}m.`, threadID);
      }
      u.balance = (u.balance||0) + REWARD;
      u.dailyClaim = new Date();
      await u.save();
      db.cache.set(`user_${senderID}`, u, 60);
      api.sendMessage(`🎁 DAILY REWARD!\n💰 +$${REWARD.toLocaleString()}\n👛 Wallet: $${u.balance.toLocaleString()}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app