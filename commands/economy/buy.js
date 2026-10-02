const CATALOG = {
  "sword":1500,"shield":1200,"potion":300,"ring":2500,"crown":5000,
  "pet-cat":800,"pet-dog":800,"lucky-charm":700,"phone":3000,"laptop":8000
};
module.exports = {
  name: "buy", version: "1.0.0", role: 0,
  description: "Buy an item from shop", usage: "/buy <item> [qty]",
  execute: async function (api, event, args, db) {
    const { threadID, senderID } = event;
    try {
      const item = (args[0]||"").toLowerCase();
      const qty = parseInt(args[1]) || 1;
      if (!CATALOG[item]) return api.sendMessage("⚠️ Item not found. /shop", threadID);
      if (qty < 1 || qty > 99) return api.sendMessage("⚠️ Qty must be 1–99.", threadID);
      const cost = CATALOG[item] * qty;
      const u = await db.getUser(senderID);
      if ((u.balance||0) < cost) return api.sendMessage(`⚠️ Need $${cost.toLocaleString()}, have $${(u.balance||0).toLocaleString()}.`, threadID);
      u.balance -= cost;
      u.inventory = u.inventory || {};
      u.inventory[item] = (u.inventory[item]||0) + qty;
      u.markModified("inventory");
      await u.save();
      db.cache.set(`user_${senderID}`, u, 60);
      api.sendMessage(`✅ Bought ${qty}x ${item} for $${cost.toLocaleString()}.\n👛 Wallet: $${u.balance.toLocaleString()}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app