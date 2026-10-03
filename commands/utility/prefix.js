/**
 * commands/utility/prefix.js
 * NEXUS BOT V1 — Show prefix info with aura GIF
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══ Cooldown per thread ═══ */
const cooldowns = new Map();
const COOLDOWN_MS = 5000;

/* ═══ Aura / Anime glow GIFs — tested working ═══ */
/* ═══ Anime Aura / Power-up GIFs — mobile optimized ═══ */
const AURA_GIFS = [
  /* Solo Leveling style aura */
  "https://media.giphy.com/media/h4OGa0nLzUxU5MxQ2H/giphy.gif",
  "https://media.giphy.com/media/ZBQhoZC0nqknSviPqT/giphy.gif",
  "https://media.giphy.com/media/l4FGuhL4U2WyjdkaY/giphy.gif",

  /* Demon Slayer / breathing style */
  "https://media.giphy.com/media/kGG2uRmHnj9RmS0AMW/giphy.gif",
  "https://media.giphy.com/media/YqVXoGdHV3tRe5YcV1/giphy.gif",
  "https://media.giphy.com/media/3o7btT1T9qpQZWhNlK/giphy.gif",

  /* Jujutsu Kaisen cursed energy */
  "https://media.giphy.com/media/dAmkxHwmq5o4uHKi3G/giphy.gif",
  "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif",
  "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",

  /* Generic anime glow / power-up */
  "https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif",
  "https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif",
  "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif",
  "https://media.giphy.com/media/xUOwGhOrYP0jP6iAy4/giphy.gif",
  "https://media.giphy.com/media/dxn6fRlTIShoeBr69N/giphy.gif",
  "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
  "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif",
  "https://media.giphy.com/media/l0HlNaQ6gWfllcjDO/giphy.gif"
];

/* ═══ Fetch animated GIF ═══ */
async function fetchAuraGIF() {
  const shuffled = [...AURA_GIFS].sort(() => Math.random() - 0.5);

  for (const url of shuffled) {
    try {
      const r = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 12000,
        maxContentLength: 20 * 1024 * 1024,
        maxRedirects: 5,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "image/gif,image/webp,image/*,*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://giphy.com/"
        }
      });

      const buf = Buffer.from(r.data);
      const header = buf.slice(0, 6).toString();
      const isGIF = header === "GIF87a" || header === "GIF89a";

      if (isGIF && buf.length > 5000 && buf.length < 5 * 1024 * 1024) {
        console.log(`[prefix] GIF loaded: ${(buf.length / 1024).toFixed(0)} KB`);
        return buf;
      }
    } catch (e) {
      console.log(`[prefix] GIF fail: ${e.message.slice(0, 40)}`);
      continue;
    }
  }
  return null;
}

module.exports = {
  name: "prefix",
  aliases: ["botprefix"],
  version: "2.2.0",
  role: 0,
  description: "Show bot prefix info",
  usage: "/prefix",
  category: "utility",

  /* ⚡ Trigger check — only "prefix" word */
  checkTrigger: function (body) {
    if (!body) return false;
    const t = body.trim().toLowerCase();
    if (t === "prefix") return true;
    if (t === "botprefix") return true;
    if (t === "bot prefix") return true;
    return false;
  },

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Cooldown check ═══ */
    const now = Date.now();
    const last = cooldowns.get(String(threadID)) || 0;
    if (now - last < COOLDOWN_MS) return;
    cooldowns.set(String(threadID), now);
    if (cooldowns.size > 5000) cooldowns.clear();

    react("✨");

    /* ═══ Get prefix (group or global) ═══ */
    let prefix = config.prefix || "/";
    if (event.isGroup) {
      try {
        const g = await db.getGroup(threadID);
        if (g && g.settings && g.settings.prefix) prefix = g.settings.prefix;
      } catch (_) {}
    }

    /* ═══ Get user full name ═══ */
    let userName = "User";
    try {
      const ui = await api.getUserInfo(senderID);
      if (ui && ui[senderID] && ui[senderID].name) {
        userName = ui[senderID].name;
      }
    } catch (_) {}

    /* ═══ Clean card — bot name once at bottom ═══ */
    const card =
      `╭──────────────────────╮\n` +
      `│    ✦  P R E F I X  ✦   │\n` +
      `╰──────────────────────╯\n` +
      `\n` +
      `👋 Hey ${userName}\n` +
      `\n` +
      `  ⚡  Prefix  ➜  ${prefix}\n` +
      `\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `  💎  NEXUS BOT V1`;

    /* ═══ Try to fetch GIF ═══ */
    let tmpPath = null;
    try {
      const gifBuf = await fetchAuraGIF();
      if (gifBuf) {
        tmpPath = path.join(os.tmpdir(), `prefix_${Date.now()}.gif`);
        await fs.writeFile(tmpPath, gifBuf);

        return api.sendMessage({
          body: card,
          attachment: fs.createReadStream(tmpPath)
        }, threadID, () => {
          try { fs.unlinkSync(tmpPath); } catch (_) {}
        });
      } else {
        console.log("[prefix] no GIF available, text only");
      }
    } catch (e) {
      console.log(`[prefix] GIF error: ${e.message}`);
    }

    /* Fallback: text only */
    api.sendMessage(card, threadID);
  }
};

// © 2026 NEXUS BOT V1