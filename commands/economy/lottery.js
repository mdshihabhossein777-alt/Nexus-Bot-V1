const PRICE = 500, WIN = 5000, CHANCE = 0.1;
module.exports = {
  name: "lottery", aliases: ["lotto", "ticket"], version: "1.0.0", role: 0,
  description: "Buy a lottery ticket ($500 → $5,000 chance)", usage: "/lottery",
  execute: async function (api, event, args, db) {
    const { threadID, senderID } = event;
    try {
      const u = await db.getUser(senderID);
      if ((u.balance||0) < PRICE) return api.sendMessage(`⚠️ Ticket costs $${PRICE}.`, threadID);
      u.balance -= PRICE;
      const win = Math.random() < CHANCE;
      if (win) u.balance += WIN;
      await u.save(); db.cache.set(`user_${senderID}`, u, 60);
      api.sendMessage(
        win ? `🎟️ JACKPOT! +$${WIN.toLocaleString()}!\n👛 $${u.balance.toLocaleString()}`
            : `🎟️ No luck. Try again!\n👛 $${u.balance.toLocaleString()}`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app