/**
 * commands/ai/tts.js
 * NEXUS BOT V1 — Text to Voice (Google TTS + Cooldown)
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

/* ═══ Cooldown Store ═══ */
const cooldowns = new Map();
const COOLDOWN_MS = 30 * 1000;   // 30 seconds

module.exports = {
  name: "tts",
  aliases: ["say"],
  version: "2.3",
  role: 0,
  description: "Text to voice (30s cooldown for members)",
  usage: "/tts [lang] <text>",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Owner check ═══ */
    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));

    /* ═══ Cooldown check (owner unlimited) ═══ */
    if (!isOwner) {
      const last = cooldowns.get(String(senderID)) || 0;
      const remain = COOLDOWN_MS - (Date.now() - last);

      if (remain > 0) {
        react("⏳");
        const sec = Math.ceil(remain / 1000);
        return api.sendMessage(`❌ Cooldown: ${sec}s left`, threadID);
      }

      cooldowns.set(String(senderID), Date.now());

      if (cooldowns.size > 5000) cooldowns.clear();
    }

    /* ═══ Parse lang + text ═══ */
    let lang = "bn";
    let text = args.join(" ").trim();

    if (args[0] && args[0].length === 2 && /^[a-z]{2}$/i.test(args[0])) {
      lang = args[0].toLowerCase();
      text = args.slice(1).join(" ").trim();
    }

    if (!text) {
      react("❓");
      return api.sendMessage("Use: /tts bn Hello", threadID);
    }

    react("⏳");

    const cacheDir = path.join(__dirname, "cache");
    fs.ensureDirSync(cacheDir);
    const filePath = path.join(cacheDir, `tts_${Date.now()}.mp3`);

    try {
      /* ═══ Google TTS — natural params ═══ */
      const url =
        `https://translate.google.com/translate_tts` +
        `?ie=UTF-8` +
        `&q=${encodeURIComponent(text)}` +
        `&tl=${lang}` +
        `&total=1` +
        `&idx=0` +
        `&textlen=${text.length}` +
        `&client=tw-ob` +
        `&prev=input` +
        `&ttsspeed=0.85`;

      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 20000,
        maxContentLength: 5 * 1024 * 1024,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://translate.google.com/",
          "Accept": "audio/mpeg,*/*"
        }
      });

      const buf = Buffer.from(res.data);
      if (buf.length < 500) throw new Error("audio too small");

      await fs.writeFile(filePath, buf);

      api.sendMessage({
        body: "",
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        try { fs.unlinkSync(filePath); } catch (_) {}
      });

      react("✅");

    } catch (e) {
      console.error("[tts] error:", e.message);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}

      let errLine = "unknown error";
      if (e.message.includes("timeout")) errLine = "network timeout";
      else if (e.message.includes("audio too small")) errLine = "audio generation failed";
      else if (e.message.includes("ENOTFOUND")) errLine = "network unreachable";
      else errLine = e.message.slice(0, 60);

      react("❌");
      return api.sendMessage(`❌ ${errLine}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1
