module.exports = {
  name: "withdraw", aliases: ["wd"], version: "1.0.0", role: 0,
  description: "Bank → Wallet", usage: "/withdraw <amount|all>",
  execute: async function (api, event, args, db) {
    const { threadID, senderID } = event;
    try {
      const u = await db.getUser(senderID);
      const a = (args[0]||"").toLowerCase();
      if (!a) return api.sendMessage("📝 Usage: /withdraw <amount|all>", threadID);
      const amount = a === "all" ? (u.bank||0) : parseInt(a);
      if (!Number.isFinite(amount) || amount <= 0) return api.sendMessage("⚠️ Invalid amount.", threadID);
      if (amount > (u.bank||0)) return api.sendMessage(`⚠️ Only $${(u.bank||0).toLocaleString()} in bank.`, threadID);
      u.bank -= amount;
      u.balance = (u.balance||0) + amount;
      await u.save();
      db.cache.set(`user_${senderID}`, u, 60);
      api.sendMessage(`✅ Withdrew $${amount.toLocaleString()}.\n👛 $${u.balance.toLocaleString()} | 🏦 $${u.bank.toLocaleString()}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app