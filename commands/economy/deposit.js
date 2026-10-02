module.exports = {
  name: "deposit", aliases: ["dep"], version: "1.0.0", role: 0,
  description: "Wallet → Bank", usage: "/deposit <amount|all>",
  execute: async function (api, event, args, db) {
    const { threadID, senderID } = event;
    try {
      const u = await db.getUser(senderID);
      const a = (args[0]||"").toLowerCase();
      if (!a) return api.sendMessage("📝 Usage: /deposit <amount|all>", threadID);
      const amount = a === "all" ? (u.balance||0) : parseInt(a);
      if (!Number.isFinite(amount) || amount <= 0) return api.sendMessage("⚠️ Invalid amount.", threadID);
      if (amount > (u.balance||0)) return api.sendMessage(`⚠️ Only $${(u.balance||0).toLocaleString()} in wallet.`, threadID);
      u.balance -= amount;
      u.bank = (u.bank||0) + amount;
      await u.save();
      db.cache.set(`user_${senderID}`, u, 60);
      api.sendMessage(`✅ Deposited $${amount.toLocaleString()}.\n👛 $${u.balance.toLocaleString()} | 🏦 $${u.bank.toLocaleString()}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app