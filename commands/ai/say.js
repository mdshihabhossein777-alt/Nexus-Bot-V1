/**
 * commands/ai/say.js
 * NEXUS BOT V1 — Text to Voice v5.0 (edge-tts + Google TTS)
 * © 2026
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const axios = require("axios");

const log  = (...a) => console.log("[say]", ...a);

/* ═══ Voice database ═══ */
const VOICES = {
  /* Bangla */
  "bn":    "bn-BD-NabanitaNeural",
  "bn-m":  "bn-BD-PradeepNeural",

  /* English US */
  "en":    "en-US-AriaNeural",
  "en-m":  "en-US-GuyNeural",
  "ana":   "en-US-AnaNeural",
  "tony":  "en-US-TonyNeural",

  /* English UK */
  "uk":    "en-GB-SoniaNeural",
  "uk-m":  "en-GB-RyanNeural",

  /* English India */
  "in":    "en-IN-NeerjaNeural",
  "in-m":  "en-IN-PrabhatNeural",

  /* Hindi/Urdu */
  "hi":    "hi-IN-SwaraNeural",
  "hi-m":  "hi-IN-MadhurNeural",
  "ur":    "ur-PK-UzmaNeural",

  /* Arabic */
  "ar":    "ar-SA-ZariyahNeural",

  /* European */
  "es":    "es-ES-ElviraNeural",
  "fr":    "fr-FR-DeniseNeural",
  "de":    "de-DE-KatjaNeural",
  "it":    "it-IT-ElsaNeural",
  "pt":    "pt-BR-FranciscaNeural",
  "ru":    "ru-RU-SvetlanaNeural",

  /* Asian */
  "ja":    "ja-JP-NanamiNeural",
  "ja-m":  "ja-JP-KeitaNeural",
  "ko":    "ko-KR-SunHiNeural",
  "zh":    "zh-CN-XiaoxiaoNeural",
  "tr":    "tr-TR-EmelNeural",
  "id":    "id-ID-GadisNeural",
  "th":    "th-TH-PremwadeeNeural",
  "vi":    "vi-VN-HoaiMyNeural"
};

/* ═══ Detect language from Unicode ═══ */
function detectLang(text) {
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u3040-\u30FF]/.test(text)) return "ja";
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  if (/[\u0400-\u04FF]/.test(text)) return "ru";
  return "en";
}

/* ═══ Audio verify ═══ */
function isAudio(buf) {
  if (!buf || buf.length < 500) return false;
  const s3 = buf.slice(0, 3).toString();
  if (s3 === "ID3") return true;
  if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return true;
  if (buf.slice(0, 4).toString() === "RIFF") return true;
  if (buf.slice(0, 4).toString() === "OggS") return true;
  return false;
}

/* ═══ Provider 1 — edge-tts (main) ═══ */
async function tryEdgeTTS(text, voice, outPath) {
  try {
    const mod = require("edge-tts");
    const EdgeTTS = mod.EdgeTTS || mod.default;
    if (!EdgeTTS) return null;

    const tts = new EdgeTTS();
    await tts.synthesize(text, voice, outPath);

    if (fs.existsSync(outPath)) {
      const buf = fs.readFileSync(outPath);
      if (isAudio(buf)) {
        log("✅ edge-tts");
        return buf;
      }
    }
  } catch (e) {
    log("edge-tts fail: " + e.message.slice(0, 50));
  }
  return null;
}

/* ═══ Provider 2 — Google Translate TTS (fallback) ═══ */
async function tryGoogleTTS(text, lang) {
  try {
    const chunk = text.slice(0, 190);
    const url = "https://translate.google.com/translate_tts" +
      "?ie=UTF-8&q=" + encodeURIComponent(chunk) +
      "&tl=" + (lang || "en") +
      "&client=tw-ob&ttsspeed=0.9";

    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000,
      maxContentLength: 5 * 1024 * 1024,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/",
        "Accept": "audio/mpeg,*/*"
      }
    });

    const buf = Buffer.from(r.data);
    if (isAudio(buf)) {
      log("✅ Google TTS");
      return buf;
    }
  } catch (e) {
    log("google fail: " + e.message.slice(0, 50));
  }
  return null;
}

/* ═══ Provider 3 — StreamElements (last resort) ═══ */
async function tryStreamElements(text, voice) {
  try {
    const r = await axios.get("https://api.streamelements.com/kappa/v2/speech", {
      params: { voice, text: text.slice(0, 300) },
      responseType: "arraybuffer",
      timeout: 25000,
      maxContentLength: 10 * 1024 * 1024,
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const buf = Buffer.from(r.data);
    if (isAudio(buf)) {
      log("✅ StreamElements");
      return buf;
    }
  } catch (_) {}
  return null;
}

/* ═══ Master ═══ */
async function generateAudio(text, voiceName, lang, tmpFile) {
  const b1 = await tryEdgeTTS(text, voiceName, tmpFile);
  if (b1) return b1;

  const b2 = await tryGoogleTTS(text, lang);
  if (b2) return b2;

  const b3 = await tryStreamElements(text, "Brian");
  if (b3) return b3;

  return null;
}

/* ═══ Main command ═══ */
module.exports = {
  name: "say",
  aliases: ["tts", "voice", "speak"],
  version: "5.0.0",
  role: 0,
  description: "Text to voice — 25+ voices",
  usage: "/say [voice] <text>",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, body, messageReply } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Parse ═══ */
    let rawArgs = (args || []).slice();

    if (!rawArgs.length && body) {
      const prefix = config.prefix || "/";
      let raw = body.trim();
      if (raw.startsWith(prefix)) raw = raw.slice(prefix.length).trim();
      raw = raw.replace(/^(say|tts|voice|speak)\s+/i, "").trim();
      rawArgs = raw ? raw.split(/\s+/) : [];
    }

    if (!rawArgs.length && !(messageReply && messageReply.body)) {
      react("❓");
      return api.sendMessage(
        "🎙️ Usage: /say <text>\n" +
        "Or: /say <voice> <text>\n\n" +
        "🎭 Voices: bn, en, hi, ur, ar, ja, ko, zh, fr, de, es, ru, ...\n" +
        "📌 Example: /say ja konnichiwa",
        threadID
      );
    }

    /* ═══ Parse voice ═══ */
    let voiceKey = null;
    let text = rawArgs.join(" ").trim();

    if (rawArgs[0] && VOICES[rawArgs[0].toLowerCase()]) {
      voiceKey = rawArgs[0].toLowerCase();
      text = rawArgs.slice(1).join(" ").trim();
    }

    /* Reply fallback */
    if (!text && messageReply && messageReply.body) {
      text = String(messageReply.body).trim();
    }

    if (!text) {
      react("❓");
      return;
    }

    if (text.length > 500) text = text.slice(0, 500);

    react("⏳");

    /* ═══ Determine voice ═══ */
    const lang = detectLang(text);
    const finalVoice = voiceKey ? VOICES[voiceKey] : (VOICES[lang] || VOICES["en"]);

    const tmpFile = path.join(os.tmpdir(), `say_${Date.now()}_${senderID}.mp3`);

    try {
      const buf = await generateAudio(text, finalVoice, lang, tmpFile);

      if (!buf || buf.length < 500) {
        react("❌");
        return api.sendMessage("❌ Voice generate korte pari ni", threadID);
      }

      await fs.writeFile(tmpFile, buf);

      api.sendMessage({
        body: "",
        attachment: fs.createReadStream(tmpFile)
      }, threadID, (err) => {
        try { fs.unlinkSync(tmpFile); } catch (_) {}
        if (err) { react("❌"); } else { react("✅"); }
      });

    } catch (e) {
      log("error: " + e.message);
      try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (_) {}
      react("❌");
      api.sendMessage("❌ " + e.message.slice(0, 60), threadID);
    }
  }
};

// © 2026 NEXUS BOT V1