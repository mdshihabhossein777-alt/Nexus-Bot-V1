/**
 * commands/ai/tts.js
 * NEXUS BOT V1 — Text to Voice
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

module.exports = {
  name: "tts",
  aliases: ["say", "voice"],
  version: "2.2",
  role: 0,
  description: "Text to voice",
  usage: "/tts [lang] <text>",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

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
      const url =
        `https://translate.google.com/translate_tts` +
        `?ie=UTF-8` +
        `&tl=${lang}` +
        `&client=tw-ob` +
        `&q=${encodeURIComponent(text)}`;

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
