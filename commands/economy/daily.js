/**
 * commands/economy/daily.js
 * NEXUS BOT V1 — Daily reward (100K coins)
 * © 2026
 */

module.exports = {
  name: "daily",
  aliases: ["claim", "dailys"],
  version: "1.0.0",
  role: 0,
  description: "Claim daily reward",
  usage: "/daily",
  category: "economy",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    react("⏳");

    try {
      const user = await db.getUser(senderID);
      const now = Date.now();
      const COOLDOWN = 24 * 60 * 60 * 1000; /* 24 hours */
      const REWARD = 100000; /* ⚡ 100K coins */

      /* ═══ Check cooldown ═══ */
      if (user.dailyClaim && now - user.dailyClaim < COOLDOWN) {
        const remain = COOLDOWN - (now - user.dailyClaim);
        const hrs = Math.floor(remain / (60 * 60 * 1000));
        const mins = Math.floor((remain % (60 * 60 * 1000)) / (60 * 1000));
        const secs = Math.floor((remain % (60 * 1000)) / 1000);

        react("⏳");
        return api.sendMessage(
          `⏳ Daily cooldown!\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `⏰ Next claim in: **${hrs}h ${mins}m ${secs}s**`,
          threadID
        );
      }

      /* ═══ Give reward ═══ */
      user.balance = (user.balance || 0) + REWARD;
      user.dailyClaim = now;
      await user.save();

      /* ═══ Get user name ═══ */
      let name = "User";
      try {
        const ui = await api.getUserInfo(senderID);
        name = ui[senderID]?.name || "User";
      } catch (_) {}

      react("💎");
      return api.sendMessage(
        `💎 DAILY REWARD\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 ${name}\n` +
        `💵 Reward: **+${REWARD.toLocaleString()}** $coins\n` +
        `💰 New Balance: **${user.balance.toLocaleString()}** $coins\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⏰ Come back in 24 hours!`,
        threadID
      );

    } catch (e) {
      console.error("[daily] error:", e.message);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1