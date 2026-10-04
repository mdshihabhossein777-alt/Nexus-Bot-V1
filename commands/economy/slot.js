/**
 * commands/economy/slot.js
 * NEXUS BOT V1 — Slot machine with 30% win chance
 * © 2026
 */

/* ═══ Slot symbols with weights ═══ */
const SYMBOLS = [
  { emoji: "🍒", weight: 30, name: "Cherry" },
  { emoji: "🍋", weight: 25, name: "Lemon" },
  { emoji: "🍇", weight: 20, name: "Grapes" },
  { emoji: "⭐", weight: 15, name: "Star" },
  { emoji: "💎", weight: 7,  name: "Diamond" },
  { emoji: "7️⃣", weight: 3,  name: "Lucky 7" }
];

/* ═══ Weighted random pick ═══ */
function pickSymbol() {
  const total = SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const s of SYMBOLS) {
    if (r < s.weight) return s;
    r -= s.weight;
  }
  return SYMBOLS[0];
}

/* ═══ Animated slot card ═══ */
function buildSlotCard(s1, s2, s3, bet, result) {
  /* Result banner */
  let banner = "🎰  S L O T  M A C H I N E  🎰";
  let resultLine = "";
  
  if (result.type === "jackpot") {
    banner = "🎉  J A C K P O T !  🎉";
    resultLine = `💎 +${result.amount.toLocaleString()} $coins (100x)`;
  } else if (result.type === "bigwin") {
    banner = "🔥  B I G   W I N !  🔥";
    resultLine = `💵 +${result.amount.toLocaleString()} $coins (20x)`;
  } else if (result.type === "smallwin") {
    banner = "✨  S M A L L   W I N  ✨";
    resultLine = `💰 +${result.amount.toLocaleString()} $coins (3x)`;
  } else if (result.type === "twomatch") {
    banner = "🎯  T W O   M A T C H  🎯";
    resultLine = `💵 +${result.amount.toLocaleString()} $coins (1.5x)`;
  } else {
    banner = "💔  Y O U   L O S T  💔";
    resultLine = `❌ -${result.amount.toLocaleString()} $coins`;
  }

  return (
    `╔═══════════════════════════╗\n` +
    `║  ${banner.padStart(23).slice(0, 23)}  ║\n` +
    `╚═══════════════════════════╝\n` +
    `\n` +
    `      ┏━━━━━┳━━━━━┳━━━━━┓\n` +
    `      ┃     ┃     ┃     ┃\n` +
    `      ┃  ${s1.emoji}  ┃  ${s2.emoji}  ┃  ${s3.emoji}  ┃\n` +
    `      ┃     ┃     ┃     ┃\n` +
    `      ┗━━━━━┻━━━━━┻━━━━━┛\n` +
    `\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 Bet: **${bet.toLocaleString()}** $coins\n` +
    `${resultLine}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  );
}

module.exports = {
  name: "slot",
  aliases: ["slots", "casino", "spin"],
  version: "2.0.0",
  role: 0,
  description: "Slot machine with 30% win chance",
  usage: "/slot <bet>",
  category: "economy",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Parse bet ═══ */
    const bet = parseInt(args[0]);

    if (!Number.isFinite(bet) || bet < 100) {
      react("❓");
      return api.sendMessage(
        `🎰 SLOT MACHINE\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 Usage: /slot <amount>\n` +
        `💰 Minimum: 100 $coins\n\n` +
        `💡 Example: /slot 1000`,
        threadID
      );
    }

    react("🎰");

    try {
      const user = await db.getUser(senderID);

      if ((user.balance || 0) < bet) {
        react("❌");
        return api.sendMessage(
          `❌ Insufficient balance!\n` +
          `💰 Balance: **${(user.balance || 0).toLocaleString()}** $coins\n` +
          `📝 Your bet: **${bet.toLocaleString()}** $coins`,
          threadID
        );
      }

      /* ═══ Deduct bet ═══ */
      user.balance -= bet;

      /* ═══ Spin! ═══ */
      const s1 = pickSymbol();
      const s2 = pickSymbol();
      const s3 = pickSymbol();

      const isJackpot = s1.emoji === s2.emoji && s2.emoji === s3.emoji && s1.emoji === "7️⃣";
      const isThreeMatch = s1.emoji === s2.emoji && s2.emoji === s3.emoji;
      const isTwoMatch = !isThreeMatch && (
        s1.emoji === s2.emoji || s2.emoji === s3.emoji || s1.emoji === s3.emoji
      );

      /* ═══ 30% win chance gate ═══ */
      const winRoll = Math.random();
      const WIN_CHANCE = 0.30;

      let result = { type: "lose", amount: bet };

      if (winRoll < WIN_CHANCE) {
        /* ═══ We're in the 30% WIN zone ═══ */
        if (isJackpot) {
          /* 777 — 100x */
          result = { type: "jackpot", amount: bet * 100 };
        } else if (isThreeMatch) {
          /* 3 match — 20x */
          result = { type: "bigwin", amount: bet * 20 };
        } else if (isTwoMatch) {
          /* 2 match — 3x */
          result = { type: "smallwin", amount: bet * 3 };
        } else {
          /* Force a small win — 1.5x */
          result = { type: "twomatch", amount: Math.floor(bet * 1.5) };
        }
      } else {
        /* ═══ LOSE zone — but still show 2 match sometimes for excitement ═══ */
        if (isTwoMatch) {
          /* Show two-match but you still lost (fake out) */
          result = { type: "lose", amount: bet };
        } else {
          result = { type: "lose", amount: bet };
        }
      }

      /* ═══ Apply winnings ═══ */
      if (result.type !== "lose") {
        user.balance += result.amount;
      }
      await user.save();

      /* ═══ Reactions ═══ */
      if (result.type === "jackpot") react("💎");
      else if (result.type === "bigwin") react("🔥");
      else if (result.type === "smallwin") react("✨");
      else if (result.type === "twomatch") react("🎯");
      else react("💔");

      /* ═══ Build and send card ═══ */
      const card = buildSlotCard(s1, s2, s3, bet, result);

      return api.sendMessage(
        card + `\n\n💼 Balance: **${user.balance.toLocaleString()}** $coins`,
        threadID
      );

    } catch (e) {
      console.error("[slot] error:", e.message);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1