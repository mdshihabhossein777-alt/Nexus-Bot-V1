/**
 * commands/utility/prefix.js
 * NEXUS BOT V1 — Show prefix info with real anime aura GIF
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

const cooldowns = new Map();
const COOLDOWN_MS = 5000;

/* ═══ Giphy public beta key (no signup needed) ═══ */
const GIPHY_KEY = "dc6zaTOxFJmzC";

/* ═══ Search queries for anime aura GIFs ═══ */
const SEARCH_QUERIES = [
  "anime aura",
  "anime power up",
  "anime glow",
  "anime energy",
  "solo leveling aura",
  "anime magic circle",
  "anime transformation",
  "anime lightning aura"
];

/* ═══ Fetch anime aura GIF from Giphy API ═══ */
async function fetchAuraGIF() {
  const q = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];

  try {
    const r = await axios.get("https://api.giphy.com/v1/gifs/search", {
      params: {
        api_key: GIPHY_KEY,
        q: q,
        limit: 20,
        rating: "g",
        lang: "en"
      },
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const gifs = r.data?.data || [];
    if (!gifs.length) {
      console.log(`[prefix] no results for "${q}"`);
      return null;
    }

    /* Shuffle and pick one */
    const shuffled = gifs.sort(() => Math.random() - 0.5);

    for (const gif of shuffled.slice(0, 5)) {
      const url = gif.images?.original?.url ||
                  gif.images?.downsized?.url ||
                  gif.images?.fixed_height?.url;
      if (!url) continue;

      try {
        const img = await axios.get(url, {
          responseType: "arraybuffer",
          timeout: 12000,
          maxContentLength: 15 * 1024 * 1024,
          headers: { "User-Agent": "Mozilla/5.0" }
        });

        const buf = Buffer.from(img.data);
        const header = buf.slice(0, 6).toString();
        const isGIF = header === "GIF87a" || header === "GIF89a";

        if (isGIF && buf.length > 5000 && buf.length < 8 * 1024 * 1024) {
          console.log(`[prefix] GIF: ${(buf.length / 1024).toFixed(0)} KB — query: "${q}"`);
          return buf;
        }
      } catch (_) { continue; }
    }
  } catch (e) {
    console.log(`[prefix] Giphy API fail: ${e.message.slice(0, 60)}`);
  }

  return null;
}

module.exports = {
  name: "prefix",
  aliases: ["botprefix"],
  version: "3.0.0",
  role: 0,
  description: "Show bot prefix info",
  usage: "/prefix",
  category: "utility",

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

    /* Card */
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
      } else {
        console.log("[prefix] no GIF available — text only");
      }
    } catch (e) {
      console.log(`[prefix] error: ${e.message}`);
    }

    api.sendMessage(card, threadID);
  }
};

// © 2026 NEXUS BOT V1