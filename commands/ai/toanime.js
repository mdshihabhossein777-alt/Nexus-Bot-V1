/**
 * commands/ai/toanime.js
 * NEXUS BOT V1 — Convert prompt to anime-style art
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

module.exports = {
  name: "toanime",
  aliases: ["animefy", "animeart", "ghibli"],
  version: "1.1.0",
  role: 0,
  description: "Convert a prompt into anime-style art",
  usage: "/toanime <prompt>",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    const prompt = args.join(" ").trim();

    if (!prompt) {
      react("❓");
      return api.sendMessage("Usage: /toanime <prompt>", threadID);
    }

    react("⏳");

    let tmpPath = null;

    try {
      const styles = [
        "anime style, studio ghibli",
        "anime style, makoto shinkai",
        "anime style, kyoto animation",
        "anime style, 4k detailed"
      ];
      const style = styles[Math.floor(Math.random() * styles.length)];
      const fullPrompt = `${style}, ${prompt}`;
      const seed = Math.floor(Math.random() * 999999);

      const url =
        `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}` +
        `?model=flux&width=1024&height=1024&nologo=true&seed=${seed}`;

      const r = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 90000,
        maxContentLength: 20 * 1024 * 1024,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const buf = Buffer.from(r.data);
      if (buf.length < 1000) throw new Error("image too small");

      /* ⚡ Detect actual format */
      let ext = "jpg";
      if (buf[0] === 0xFF && buf[1] === 0xD8) ext = "jpg";
      else if (buf[0] === 0x89 && buf[1] === 0x50) ext = "png";
      else if (buf.slice(0, 4).toString() === "RIFF") ext = "webp";

      /* ⚡ Save as proper file — prevents .bin issue */
      tmpPath = path.join(os.tmpdir(), `toanime_${Date.now()}.${ext}`);
      await fs.writeFile(tmpPath, buf);

      react("🎌");

      api.sendMessage({
        body: `🎌 ${prompt.slice(0, 100)}`,
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[toanime] error:", e.message);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }

      let errLine = "unknown error";
      if (e.message.includes("timeout")) errLine = "network timeout";
      else if (e.message.includes("image too small")) errLine = "image generation failed";
      else if (e.message.includes("ENOTFOUND")) errLine = "network unreachable";
      else errLine = e.message.slice(0, 60);

      react("❌");
      api.sendMessage(`❌ ${errLine}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1