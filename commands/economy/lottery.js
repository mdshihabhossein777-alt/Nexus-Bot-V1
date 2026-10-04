/**
 * commands/economy/lottery.js
 * NEXUS BOT V1 — Lottery with 30% win chance, 10x reward
 * © 2026
 */

module.exports = {
  name: "lottery",
  aliases: ["lotto", "bet", "jackpot"],
  version: "1.0.0",
  role: 0,
  description: "Try your luck - 30% chance to win 10x",
  usage: "/lottery <amount>",
  category: "economy",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Parse bet amount ═══ */
    const bet = parseInt(args[0]);

    if (!Number.isFinite(bet) || bet < 100) {
      react("❓");
      return api.sendMessage(
        `🎰 LOTTERY\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 Usage: /lottery <amount>\n` +
        `💰 Minimum: 100 coins\n` +
        `🎯 Win Chance: 30%\n` +
        `💎 Win Multiplier: 10x\n\n` +
        `💡 Example: /lottery 1000`,
        threadID
      );
    }

    react("⏳");

    try {
      const user = await db.getUser(senderID);

      /* ═══ Check balance ═══ */
      if ((user.balance || 0) < bet) {
        react("❌");
        return api.sendMessage(
          `❌ Insufficient balance!\n` +
          `💰 Your balance: **${(user.balance || 0).toLocaleString()}** $coins\n` +
          `📝 Your bet: **${bet.toLocaleString()}** $coins`,
          threadID
        );
      }

      /* ═══ Deduct bet ═══ */
      user.balance -= bet;

      /* ═══ Roll the dice — 30% win chance ═══ */
      const roll = Math.random();
      const WIN_CHANCE = 0.30;
      const MULTIPLIER = 10;

      let resultText;

      if (roll < WIN_CHANCE) {
        /* ═══ WIN ═══ */
        const winnings = bet * MULTIPLIER;
        user.balance += winnings;
        await user.save();

        react("🎉");
        resultText =
          `🎉 **JACKPOT! YOU WON!**\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `💰 Bet: **${bet.toLocaleString()}**\n` +
          `💎 Multiplier: **${MULTIPLIER}x**\n` +
          `🎁 Winnings: **+${winnings.toLocaleString()}** $coins\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `💼 New Balance: **${user.balance.toLocaleString()}** $coins`;

      } else {
        /* ═══ LOSE ═══ */
        await user.save();

        react("💔");
        resultText =
          `💔 **You lost!**\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `💰 Bet: **${bet.toLocaleString()}**\n` +
          `💎 Win Chance: **30%**\n` +
          `❌ Lost: **-${bet.toLocaleString()}** $coins\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `💼 New Balance: **${user.balance.toLocaleString()}** $coins\n\n` +
          `🍀 Better luck next time!`;
      }

      return api.sendMessage(resultText, threadID);

    } catch (e) {
      console.error("[lottery] error:", e.message);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1