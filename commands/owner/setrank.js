// commands/owner/setrank.js - NEXUS V1 - Auto Exp
const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const RANK_FILE = path.join(DATA_DIR, "rank.json");

function loadRankData() {
  try { return fs.readJsonSync(RANK_FILE) || {}; } catch (_) { return {}; }
}
function saveRankData(d) {
  try { fs.writeJsonSync(RANK_FILE, d); } catch (e) { console.error("[setrank]", e.message); }
}

/* ⚡ Formula: exp = level * 10000 (auto) */
function autoExp(level) {
  if (level >= 100) return 0;
  return level * 10000;
}

module.exports = {
  name: "setrank",
  aliases: ["setlevel", "givelevel", "addlevel"],
  version: "2.0.0",
  role: 2,
  description: "OWNER: Set level with auto exp",
  usage: "/setrank <level> [@user]  |  /setrank infinity [@user]  |  /setrank reset [@user]",
  execute: async function (api, event, args, db) {
    const { threadID, senderID, mentions, messageReply } = event;

    try {
      if (!args.length) {
        return api.sendMessage(
          `📝 USAGE:\n` +
          `/setrank <level>         → set your level\n` +
          `/setrank <level> @user   → set someone's level\n` +
          `/setrank infinity        → instant INFINITY (Level 100)\n` +
          `/setrank reset           → reset\n\n` +
          `⚡ Auto Exp: level × 10,000\n` +
          `Example: /setrank 90 → Level 90 + Exp 900,000\n\n` +
          `Tiers:\n` +
          `• 1-10    NORMAL\n` +
          `• 11-25   RARE 💎\n` +
          `• 26-50   EPIC 🔥\n` +
          `• 51-99   VIP GOLD 👑\n` +
          `• 100+    INFINITY ∞`,
          threadID
        );
      }

      /* ---- Resolve target ---- */
      let target = String(senderID);
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);

      /* ---- Load data ---- */
      const data = loadRankData();
      if (!data[threadID]) data[threadID] = {};
      if (!data[threadID][target]) data[threadID][target] = { exp: 0, level: 1, msgs: 0 };

      const arg0 = (args[0] || "").toLowerCase();
      let newLevel, newExp, actionText;

      /* ---- Parse argument ---- */
      if (arg0 === "infinity" || arg0 === "inf" || arg0 === "∞") {
        newLevel = 100;
        newExp = 0;
        actionText = "👑 INFINITY UNLOCKED";
      } else if (arg0 === "reset") {
        newLevel = 1;
        newExp = 0;
        data[threadID][target].msgs = 0;
        actionText = "🔄 Reset to Level 1";
      } else {
        const n = parseInt(arg0);
        if (!Number.isFinite(n) || n < 1 || n > 9999999) {
          return api.sendMessage("⚠️ Invalid level. Use 1–9999999 or 'infinity'.", threadID);
        }
        newLevel = n;
        newExp = autoExp(n);
        actionText = `✅ Level ${n} set (Exp: ${newExp.toLocaleString()})`;
      }

      /* ---- Apply ---- */
      data[threadID][target].level = newLevel;
      data[threadID][target].exp = newExp;
      saveRankData(data);

      /* ---- Get name ---- */
      let name = target;
      try {
        const info = await api.getUserInfo(target);
        if (info && info[target]) name = info[target].name;
      } catch (_) {}

      /* ---- Tier ---- */
      let tierName = "NORMAL";
      if (newLevel >= 100) tierName = "INFINITY ∞ LEGEND";
      else if (newLevel >= 51) tierName = "VIP GOLD 👑";
      else if (newLevel >= 26) tierName = "EPIC 🔥";
      else if (newLevel >= 11) tierName = "RARE 💎";

      api.sendMessage(
        `🎯 RANK UPDATED\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 ${name}\n` +
        `📊 Level: ${newLevel}\n` +
        `💫 Exp: ${newExp.toLocaleString()}\n` +
        `🏆 Tier: ${tierName}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `${actionText}\n\n` +
        `💡 /rank পাঠান card দেখতে!`,
        threadID
      );

    } catch (e) {
      api.sendMessage("❌ Error: " + e.message, threadID);
    }
  }
};
// Powered by Shihab