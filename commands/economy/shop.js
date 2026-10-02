const CATALOG = {
  "sword":       { price: 1500, emoji: "🗡️" },
  "shield":      { price: 1200, emoji: "🛡️" },
  "potion":      { price: 300,  emoji: "🧪" },
  "ring":        { price: 2500, emoji: "💍" },
  "crown":       { price: 5000, emoji: "👑" },
  "pet-cat":     { price: 800,  emoji: "🐱" },
  "pet-dog":     { price: 800,  emoji: "🐶" },
  "lucky-charm": { price: 700,  emoji: "🍀" },
  "phone":       { price: 3000, emoji: "📱" },
  "laptop":      { price: 8000, emoji: "💻" }
};

module.exports = {
  name: "shop", aliases: ["store"], version: "1.0.0", role: 0,
  description: "Show the item shop", usage: "/shop",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const lines = Object.entries(CATALOG).map(([k,v]) => `${v.emoji} ${k.padEnd(12)} $${v.price.toLocaleString()}`);
      api.sendMessage(`🏪 NEXUS SHOP\n────────────\n${lines.join("\n")}\n\nBuy: /buy <item> [qty]`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app