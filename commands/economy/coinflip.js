module.exports = {
  name: "coinflip", aliases: ["cf", "coin"], version: "1.0.0", role: 0,
  description: "Bet on heads/tails", usage: "/coinflip <heads|tails> <bet>",
  execute: async function (api, event, args, db) {
    const { threadID, senderID } = event;
    try {
      const side = (args[0]||"").toLowerCase();
      const bet = parseInt(args[1]) || 100;
      if (!["heads","tails","h","t"].includes(side)) return api.sendMessage("📝 /coinflip <heads|tails> <bet>", threadID);
      const pick = side.startsWith("h") ? "heads" : "tails";
      const u = await db.getUser(senderID);
      if ((u.balance||0) < bet) return api.sendMessage("⚠️ Insufficient balance.", threadID);
      const result = Math.random() < 0.5 ? "heads" : "tails";
      const win = result === pick;
      u.balance += win ? bet : -bet;
      await u.save(); db.cache.set(`user_${senderID}`, u, 60);
      api.sendMessage(
        `🪙 Landed: ${result.toUpperCase()}\n${win ? `🎉 Won $${bet.toLocaleString()}!` : `💀 Lost $${bet.toLocaleString()}.`}\n👛 $${u.balance.toLocaleString()}`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app