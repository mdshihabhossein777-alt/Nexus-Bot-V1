/**
 * commands/ai/voice.js
 * NEXUS BOT V1 — Text to voice with many voice options
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══ Available voices ═══ */
const VOICES = {
  /* English — Female */
  aria:    { voice: "en-US-AriaNeural",     desc: "US Female — Natural" },
  jenny:   { voice: "en-US-JennyNeural",    desc: "US Female — Soft" },
  michelle:{ voice: "en-US-MichelleNeural", desc: "US Female — Mature" },
  emma:    { voice: "en-US-EmmaNeural",     desc: "US Female — Young" },
  ana:     { voice: "en-US-AnaNeural",      desc: "US Child — Cute" },

  /* English — Male */
  guy:     { voice: "en-US-GuyNeural",      desc: "US Male — Deep" },
  davis:   { voice: "en-US-DavisNeural",    desc: "US Male — Casual" },
  tony:    { voice: "en-US-TonyNeural",     desc: "US Male — Strong" },

  /* Bangla */
  bn_f:    { voice: "bn-BD-NabanitaNeural", desc: "Bangla Female" },
  bn_m:    { voice: "bn-BD-PradeepNeural",  desc: "Bangla Male" },

  /* Hindi */
  hi_f:    { voice: "hi-IN-SwaraNeural",    desc: "Hindi Female" },
  hi_m:    { voice: "hi-IN-MadhurNeural",   desc: "Hindi Male" },

  /* Anime-style (Japanese) */
  anime_f: { voice: "ja-JP-NanamiNeural",   desc: "Anime Female 🇯🇵" },
  anime_m: { voice: "ja-JP-KeitaNeural",    desc: "Anime Male 🇯🇵" },

  /* Korean / K-pop */
  kpop:    { voice: "ko-KR-SunHiNeural",    desc: "K-Pop Female 🇰🇷" },

  /* Spanish / French */
  es_f:    { voice: "es-ES-ElviraNeural",   desc: "Spanish Female" },
  fr_f:    { voice: "fr-FR-DeniseNeural",   desc: "French Female" }
};

module.exports = {
  name: "voice",
  aliases: ["say", "speak", "tts"],
  version: "2.0.0",
  role: 0,
  description: "Text to voice with many voice options",
  usage: "/voice <voice> <text>",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Help ═══ */
    if (!args.length) {
      const list = Object.entries(VOICES)
        .map(([k, v]) => `  ${k.padEnd(10)} — ${v.desc}`)
        .join("\n");
      react("📘");
      return api.sendMessage(
        `🎙️ VOICE SYSTEM\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 Usage: /voice <voice> <text>\n\n` +
        `🎭 Available voices:\n${list}\n\n` +
        `💡 Example: /voice aria Hello World`,
        threadID
      );
    }

    /* ═══ Parse ═══ */
    let voiceKey = "bn_f";
    let text = "";

    if (args[0] && VOICES[args[0].toLowerCase()]) {
      voiceKey = args[0].toLowerCase();
      text = args.slice(1).join(" ").trim();
    } else {
      text = args.join(" ").trim();
    }

    if (!text) {
      react("❓");
      return api.sendMessage("Usage: /voice <voice> <text>", threadID);
    }

    if (text.length > 300) text = text.slice(0, 300);
    react("⏳");

    let tmpPath = null;

    try {
      /* ═══ Use edge-tts package ═══ */
      const { EdgeTTS } = require("edge-tts");

      const selectedVoice = VOICES[voiceKey].voice;
      const tts = new EdgeTTS();

      tmpPath = path.join(os.tmpdir(), `voice_${Date.now()}.mp3`);
      await tts.synthesize(text, selectedVoice, tmpPath);

      if (!fs.existsSync(tmpPath)) throw new Error("audio file not created");

      const stats = await fs.stat(tmpPath);
      if (stats.size < 1000) throw new Error("audio too small");

      react("🎙️");
      api.sendMessage({
        body: `🎙️ Voice: ${voiceKey} (${VOICES[voiceKey].desc})`,
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[voice] error:", e.message);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};