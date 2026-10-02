const REELS = ["🍒","🍋","🔔","💎","7️⃣"];
const PAY = { "🍒":2, "🍋":3, "🔔":4, "💎":6, "7️⃣":10 };
module.exports = {
  name: "slot", aliases: ["slots"], version: "1.0.0", role: 0,
  description: "Play slot machine", usage: "/slot <bet>",
  execute: async function (api, event, args, db) {
    const { threadID, senderID } = event;
    try {
      const bet = parseInt(args[0]) || 100;
      if (bet <= 0) return api.sendMessage("📝 Usage: /slot <bet>", threadID);
      const u = await db.getUser(senderID);
      if ((u.balance||0) < bet) return api.sendMessage("⚠️ Insufficient balance.", threadID);
      const r = [0,0,0].map(() => REELS[Math.floor(Math.random()*REELS.length)]);
      let win = 0;
      if (r[0]===r[1] && r[1]===r[2]) win = bet * PAY[r[0]];
      else if (r[0]===r[1] || r[1]===r[2] || r[0]===r[2]) win = Math.floor(bet*1.5);
      u.balance -= bet;
      u.balance += win;
      await u.save(); db.cache.set(`user_${senderID}`, u, 60);
      api.sendMessage(
        `🎰 | ${r.join(" | ")} |\n${win>0 ? `🎉 Won $${win.toLocaleString()}!` : `💀 Lost $${bet.toLocaleString()}.`}\n👛 $${u.balance.toLocaleString()}`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app