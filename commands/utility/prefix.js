/**
 * commands/utility/prefix.js
 * NEXUS BOT V1 — Show prefix info
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

const cooldowns = new Map();
const COOLDOWN_MS = 5000;

/* ═══ Anime aura glow GIFs ═══ */
const AURA_GIFS = [
  "https://media.tenor.com/YtQ12sH0XcEAAAAC/anime-glitch.gif",
  "https://media.tenor.com/QBZxQVLpZ7IAAAAC/anime-aura.gif",
  "https://media.tenor.com/2KJhVKJ3fJoAAAAC/glow-anime.gif",
  "https://media.tenor.com/nJq8yvXq3-MAAAAC/anime-power.gif",
  "https://media.tenor.com/Rh_HMj4-hs8AAAAC/aura-anime.gif",
  "https://media.tenor.com/PZY3cLm_hVMAAAAC/anime-magic.gif",
  "https://media.tenor.com/W3BqFNZ4vBUAAAAC/solo-leveling-aura.gif"
];

async function fetchAuraGIF() {
  const shuffled = [...AURA_GIFS].sort(() => Math.random() - 0.5);
  for (const url of shuffled) {
    try {
      const r = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000,
        maxContentLength: 15 * 1024 * 1024,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "image/gif,image/*,*/*"
        }
      });
      const buf = Buffer.from(r.data);
      const isGIF87a = buf.slice(0, 6).toString() === "GIF87a";
      const isGIF89a = buf.slice(0, 6).toString() === "GIF89a";
      if (buf.length > 5000 && buf.length < 3 * 1024 * 1024 && (isGIF87a || isGIF89a)) {
        return buf;
      }
    } catch (_) { continue; }
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

  /* ⚡ Trigger check — only "prefix" or "/prefix" */
  checkTrigger: function (body) {
    if (!body) return false;
    const t = body.trim().toLowerCase();

    /* Exact match only */
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

    /* Cooldown */
    const now = Date.now();
    const last = cooldowns.get(String(threadID)) || 0;
    if (now - last < COOLDOWN_MS) return;
    cooldowns.set(String(threadID), now);
    if (cooldowns.size > 5000) cooldowns.clear();

    react("✨");

    /* Get prefix */
    let prefix = config.prefix || "/";
    if (event.isGroup) {
      try {
        const g = await db.getGroup(threadID);
        if (g && g.settings && g.settings.prefix) prefix = g.settings.prefix;
      } catch (_) {}
    }

    /* Full name */
    let userName = "User";
    try {
      const ui = await api.getUserInfo(senderID);
      if (ui && ui[senderID] && ui[senderID].name) {
        userName = ui[senderID].name;
      }
    } catch (_) {}

    /* ═══ Modern clean card ═══ */
    const card =
      `╭──────────────────────╮\n` +
      `│    ✦  P R E F I X  ✦   │\n` +
      `╰──────────────────────╯\n` +
      `\n` +
      `👋 Hey ${userName}\n` +
      `\n` +
      `  🤖  Bot     ➜  NEXUS BOT V1\n` +
      `  ⚡  Prefix  ➜  ${prefix}\n` +
      `\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `  💎  NEXUS BOT V1`;

    /* GIF */
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
      }
    } catch (_) {}

    api.sendMessage(card, threadID);
  }
};

// © 2026 NEXUS BOT V1