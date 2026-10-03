/**
 * commands/utility/prefix.js
 * NEXUS BOT V1 — Show prefix info when user types "/" or "prefix"
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══ Cooldown per thread ═══ */
const cooldowns = new Map();
const COOLDOWN_MS = 5000;

/* ═══ Aura GIF URLs ═══ */
const AURA_GIFS = [
  "https://media.giphy.com/media/l0HlNaQ6gWfllcjDO/giphy.gif",
  "https://media.giphy.com/media/dxn6fRlTIShoeBr69N/giphy.gif",
  "https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif",
  "https://media.tenor.com/9vRAkntogEMAAAAd/matrix-cyber.gif",
  "https://media.tenor.com/On7kvXhzml4AAAAj/loading-gif.gif"
];

async function fetchAuraGIF() {
  const shuffled = [...AURA_GIFS].sort(() => Math.random() - 0.5);
  for (const url of shuffled) {
    try {
      const r = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000,
        maxContentLength: 25 * 1024 * 1024,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "image/gif,image/*,*/*"
        }
      });
      const buf = Buffer.from(r.data);
      const isGIF87a = buf.slice(0, 6).toString() === "GIF87a";
      const isGIF89a = buf.slice(0, 6).toString() === "GIF89a";
      if (buf.length > 5000 && (isGIF87a || isGIF89a)) return buf;
    } catch (_) { continue; }
  }
  return null;
}

module.exports = {
  name: "prefix",
  aliases: ["botprefix"],
  version: "1.0.1",
  role: 0,
  description: "Show bot prefix info",
  usage: "/prefix",
  category: "utility",

  checkTrigger: function (body) {
    if (!body) return false;
    const t = body.trim();
    if (t.length < 1 || t.length > 20) return false;
    if (t === "/") return true;
    if (/^(prefix|botprefix|bot prefix|ki prefix|what.?s the prefix)$/i.test(t)) return true;
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

    /* Prefix (group or global) */
    let prefix = config.prefix || "/";
    if (event.isGroup) {
      try {
        const g = await db.getGroup(threadID);
        if (g && g.settings && g.settings.prefix) prefix = g.settings.prefix;
      } catch (_) {}
    }

    /* Bot name */
    let botName = "NEXUS BOT V1";
    try {
      if (global.NEXUS && global.NEXUS.botNickConfig && global.NEXUS.botNickConfig.nickname) {
        botName = global.NEXUS.botNickConfig.nickname;
      }
    } catch (_) {}

    /* User name */
    let userName = "User";
    try {
      const ui = await api.getUserInfo(senderID);
      if (ui && ui[senderID] && ui[senderID].name) {
        userName = ui[senderID].name.split(" ")[0];
      }
    } catch (_) {}

    /* ═══ Clean card ═══ */
    const card =
      `✨ PREFIX INFO ✨\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 Hey ${userName}!\n` +
      `\n` +
      `🤖 Bot    ➜  ${botName}\n` +
      `⚡ Prefix ➜  「 ${prefix} 」\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `\n` +
      `NEXUS BOT V1`;

    /* GIF try */
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
