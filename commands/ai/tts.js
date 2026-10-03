/**
 * commands/ai/tts.js
 * NEXUS BOT V1 — Text to Voice (Microsoft Neural Voice)
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");

/* ═══ Cooldown Store ═══ */
const cooldowns = new Map();
const COOLDOWN_MS = 30 * 1000; // 30 seconds

module.exports = {
  name: "tts",
  aliases: ["say"],
  version: "3.0",
  role: 0,
  description: "Text to voice (Bangladeshi female natural voice)",
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

    /* ═══ Cooldown check ═══ */
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
    let text = args.join(" ").trim();

    if (!text) {
      react("❓");
      return api.sendMessage("Use: /tts bn কেমন আছো", threadID);
    }

    react("⏳");

    const cacheDir = path.join(__dirname, "cache");
    fs.ensureDirSync(cacheDir);
    const filePath = path.join(cacheDir, `tts_${Date.now()}.mp3`);

    try {
      /* ═══ Set your preferred voice ═══ */
      // "bn-BD-NabanitaNeural" = Bangladesh, Female, Natural (মিষ্টি মেয়ে ভয়েস)
      const tts = new MsEdgeTTS();
      await tts.setMetadata("bn-BD-NabanitaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      /* ═══ Generate audio stream and save ═══ */
      const { audioStream } = tts.toStream(text);

      await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);
        audioStream.pipe(writeStream);
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
        audioStream.on("error", reject);
      });

      /* ═══ Check file size ═══ */
      const stats = await fs.stat(filePath);
      if (stats.size < 500) throw new Error("audio too small");

      /* ═══ Send audio file ═══ */
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
