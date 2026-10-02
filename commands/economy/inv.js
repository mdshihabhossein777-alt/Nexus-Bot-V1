module.exports = {
  name: "inv", version: "1.0.0", role: 0,
  description: "Alias of /inventory", usage: "/inv",
  execute: async function (api, event, args, db) {
    const { threadID, senderID } = event;
    try {
      const u = await db.getUser(senderID);
      const items = Object.entries(u.inventory || {});
      if (!items.length) return api.sendMessage("🎒 Inventory is empty.", threadID);
      api.sendMessage(`🎒 INVENTORY\n${items.map(([k,v]) => `• ${k} ×${v}`).join("\n")}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app