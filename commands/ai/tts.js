/**
 * commands/ai/tts.js
 * NEXUS BOT V1 — Text-to-speech (Microsoft Edge, no API key)
 * © 2026 Ariyan Shihab
 */

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { EdgeTTS } = require("edge-tts");

module.exports = {
  name: "tts",
  aliases: ["speak", "voice"],
  version: "2.0.0",
  role: 0,
  description: "Text-to-speech via Microsoft Edge",
  usage: "/tts <text>",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    const text = args.join(" ").trim();

    if (!text) {
      react("❓");
      return;
    }

    react("⏳");

    let tmpPath = null;

    try {
      /* ⚡ Bangla detect */
      const isBangla = /[\u0980-\u09FF]/.test(text);
      const voice = isBangla ? "bn-BD-NabanitaNeural" : "en-US-AriaNeural";

      const tts = new EdgeTTS();
      tmpPath = path.join(os.tmpdir(), `nexus_tts_${Date.now()}.mp3`);

      await tts.synthesize(text, voice, tmpPath);

      if (!fs.existsSync(tmpPath)) throw new Error("audio file not created");

      api.sendMessage({
        body: "",
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

      react("✅");

    } catch (e) {
      console.error("[tts] error:", e.message);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }

      /* ⚡ Short error line */
      let errLine = "unknown error";
      if (e.message.includes("ENOENT")) errLine = "edge-tts not installed";
      else if (e.message.includes("timeout")) errLine = "network timeout";
      else if (e.message.includes("audio file not created")) errLine = "audio generation failed";
      else errLine = e.message.slice(0, 60);

      react("❌");
      api.sendMessage(`❌ ${errLine}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1 | Ariyan Shihab
