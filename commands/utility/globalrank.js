module.exports = {
  name: "globalrank", aliases: ["gr"], version: "1.0.0", role: 0,
  description: "Top 10 global users by total wealth", usage: "/globalrank",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const users = await db.User.find({}).sort({ balance: -1 }).limit(10).lean();
      if (!users.length) return api.sendMessage("📊 No ranked users yet.", threadID);
      const medals = ["🥇", "🥈", "🥉"];
      const lines = [];
      for (let i = 0; i < users.length; i++) {
        const u = users[i];
        let name = u.userID;
        try { const info = await api.getUserInfo(u.userID); if (info[u.userID]) name = info[u.userID].name; } catch (e) {}
        const total = (u.balance || 0) + (u.bank || 0);
        lines.push(`${medals[i] || `${i + 1}.`} ${name} — $${total.toLocaleString()}`);
      }
      api.sendMessage(`🌍 GLOBAL TOP 10\n────────────\n${lines.join("\n")}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app