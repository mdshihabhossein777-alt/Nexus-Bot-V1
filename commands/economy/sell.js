const PRICES = {
  "sword":1500,"shield":1200,"potion":300,"ring":2500,"crown":5000,
  "pet-cat":800,"pet-dog":800,"lucky-charm":700,"phone":3000,"laptop":8000,
  "rabbit":50,"deer":120,"boar":180,"wolf":250,"bear":400,"dragon":1500,
  "sardine":30,"tuna":80,"salmon":150,"swordfish":300,"shark":700,"golden-fish":1200,
  "wheat":40,"corn":90,"tomato":140,"pumpkin":260,"melon":480,
  "coal":30,"iron":80,"gold":200,"diamond":800,"emerald":1500
};
const RATE = 0.6;
module.exports = {
  name: "sell", version: "1.0.0", role: 0,
  description: "Sell item from inventory", usage: "/sell <item> [qty]",
  execute: async function (api, event, args, db) {
    const { threadID, senderID } = event;
    try {
      const item = (args[0]||"").toLowerCase();
      const qty = parseInt(args[1]) || 1;
      if (!PRICES[item]) return api.sendMessage("⚠️ Unknown item.", threadID);
      const u = await db.getUser(senderID);
      u.inventory = u.inventory || {};
      if (!u.inventory[item] || u.inventory[item] < qty) return api.sendMessage(`⚠️ You don't have ${qty}x ${item}.`, threadID);
      const gain = Math.floor(PRICES[item] * RATE) * qty;
      u.inventory[item] -= qty;
      if (u.inventory[item] <= 0) delete u.inventory[item];
      u.balance = (u.balance||0) + gain;
      u.markModified("inventory");
      await u.save();
      db.cache.set(`user_${senderID}`, u, 60);
      api.sendMessage(`💵 Sold ${qty}x ${item} for $${gain.toLocaleString()}.\n👛 Wallet: $${u.balance.toLocaleString()}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app