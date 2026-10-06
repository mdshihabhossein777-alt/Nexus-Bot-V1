/**
 * commands/ai/say.js
 * NEXUS BOT V1 — Say command (multi-voice TTS)
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══════════════════════════════════════════════════════════
   VOICE DATABASE — Anime, Celebrity, Normal
   ═══════════════════════════════════════════════════════════ */
const VOICES = {
  /* ═══ Anime / Cartoon Style ═══ */
  "anime":      { voice: "ja-JP-NanamiNeural",   desc: "Anime Female (cute)" },
  "anime-m":    { voice: "ja-JP-KeitaNeural",    desc: "Anime Male" },
  "anime2":     { voice: "ja-JP-AoiNeural",      desc: "Anime Female 2" },
  "anime2-m":   { voice: "ja-JP-DaichiNeural",   desc: "Anime Male 2" },
  "madara":     { voice: "ja-JP-DaichiNeural",   desc: "Madara (deep anime)" },
  "naruto":     { voice: "ja-JP-KeitaNeural",    desc: "Naruto style" },
  "goku":       { voice: "ja-JP-NaokiNeural",    desc: "Goku style" },
  "luffy":      { voice: "ja-JP-KeitaNeural",    desc: "Luffy style" },
  "chibi":      { voice: "ja-JP-NanamiNeural",   desc: "Chibi cute" },
  "waifu":      { voice: "ja-JP-NanamiNeural",   desc: "Waifu voice" },

  /* ═══ Popular / Celebrity Style ═══ */
  "trump":      { voice: "en-US-TonyNeural",     desc: "Trump style (strong male)" },
  "obama":      { voice: "en-US-GuyNeural",      desc: "Obama style (calm male)" },
  "biden":      { voice: "en-US-DavisNeural",    desc: "Biden style (older male)" },
  "elon":       { voice: "en-US-GuyNeural",      desc: "Elon style" },
  "santa":      { voice: "en-US-BrianNeural",    desc: "Santa Claus" },
  "news":       { voice: "en-US-ChristopherNeural", desc: "News anchor" },
  "movie":      { voice: "en-US-RogerNeural",    desc: "Movie trailer" },
  "rapper":     { voice: "en-US-EricNeural",     desc: "Rapper style" },

  /* ═══ Normal Voices ═══ */
  "girl":       { voice: "en-US-AriaNeural",     desc: "English Girl" },
  "boy":        { voice: "en-US-GuyNeural",      desc: "English Boy" },
  "baby":       { voice: "en-US-AnaNeural",      desc: "Baby voice" },
  "uk-girl":    { voice: "en-GB-SoniaNeural",    desc: "UK Girl" },
  "uk-boy":     { voice: "en-GB-RyanNeural",     desc: "UK Boy" },
  "in-girl":    { voice: "en-IN-NeerjaNeural",   desc: "Indian Girl" },
  "in-boy":     { voice: "en-IN-PrabhatNeural",  desc: "Indian Boy" },

  /* ═══ Bangla ═══ */
  "bd-girl":    { voice: "bn-BD-NabanitaNeural", desc: "Bangla Girl" },
  "bd-boy":     { voice: "bn-BD-PradeepNeural",  desc: "Bangla Boy" },
  "bn":         { voice: "bn-BD-NabanitaNeural", desc: "Bangla (default)" },

  /* ═══ Hindi / Urdu ═══ */
  "hindi":      { voice: "hi-IN-SwaraNeural",    desc: "Hindi Girl" },
  "hindi-boy":  { voice: "hi-IN-MadhurNeural",   desc: "Hindi Boy" },
  "urdu":       { voice: "ur-PK-UzmaNeural",     desc: "Urdu Girl" },

  /* ═══ Korean / Chinese / Japanese ═══ */
  "kpop":       { voice: "ko-KR-SunHiNeural",    desc: "K-Pop Girl" },
  "korean-boy": { voice: "ko-KR-InJoonNeural",   desc: "Korean Boy" },
  "chinese":    { voice: "zh-CN-XiaoxiaoNeural", desc: "Chinese Girl" },
  "japanese":   { voice: "ja-JP-NanamiNeural",   desc: "Japanese Girl" },

  /* ═══ Others ═══ */
  "arabic":     { voice: "ar-SA-ZariyahNeural",  desc: "Arabic Girl" },
  "spanish":    { voice: "es-ES-ElviraNeural",   desc: "Spanish Girl" },
  "french":     { voice: "fr-FR-DeniseNeural",   desc: "French Girl" },
  "german":     { voice: "de-DE-KatjaNeural",    desc: "German Girl" },
  "russian":    { voice: "ru-RU-SvetlanaNeural", desc: "Russian Girl" }
};

/* ═══ Detect language ═══ */
function detectLang(text) {
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u0600-\u06FF]/.test(text)) return "ur";
  if (/[\u3040-\u30FF]/.test(text)) return "ja";
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  return "en";
}

/* ═══ Audio magic bytes ═══ */
function isAudio(buf) {
  if (!buf || buf.length < 500) return false;
  const s3 = buf.slice(0, 3).toString();
  if (s3 === "ID3") return true;
  if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return true;
  if (buf.slice(0, 4).toString() === "RIFF") return true;
  if (buf.slice(0, 4).toString() === "OggS") return true;
  return false;
}

/* ═══ Generate voice with edge-tts ═══ */
async function generateVoice(text, voiceName, tmpPath) {
  try {
    const mod = require("edge-tts");
    const EdgeTTS = mod.EdgeTTS || mod.default;
    if (!EdgeTTS) throw new Error("EdgeTTS not found");

    const tts = new EdgeTTS();
    await tts.synthesize(text, voiceName, tmpPath);

    if (fs.existsSync(tmpPath)) {
      const buf = fs.readFileSync(tmpPath);
      if (isAudio(buf)) {
        console.log("[say] ✅ edge-tts: " + voiceName);
        return buf;
      }
    }
  } catch (e) {
    console.log("[say] edge-tts fail: " + e.message.slice(0, 60));
  }
  return null;
}

/* ═══ Fallback — Google Translate TTS ═══ */
async function googleTTS(text, lang) {
  try {
    const axios = require("axios");
    const url = "https://translate.google.com/translate_tts" +
      "?ie=UTF-8&q=" + encodeURIComponent(text.slice(0, 190)) +
      "&tl=" + (lang || "en") +
      "&client=tw-ob&ttsspeed=0.9";

    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://translate.google.com/",
        "Accept": "audio/mpeg,*/*"
      }
    });
    const buf = Buffer.from(r.data);
    if (isAudio(buf)) {
      console.log("[say] ✅ google TTS");
      return buf;
    }
  } catch (_) {}
  return null;
}

/* ═══════════════════════════════════════════════════════════
   COMMAND EXPORT
   ═══════════════════════════════════════════════════════════ */
module.exports = {
  name: "say",
  aliases: ["speak", "voice"],
  version: "6.0.0",
  role: 0,
  description: "Text to voice with multi-voice + anime/popular voice",
  usage: "Sayo say <text>  OR  Sayo say <text> --v <voice>",
  category: "ai",

  /* ═══ Text trigger — "sayo say" or "say" ═══ */
  triggers: {
    text: ["sayo say", "say", "speak"]
  },

  /* ═══ Voice list ═══ */
  getVoiceList() {
    let list = "🎙️ VOICE LIST\n━━━━━━━━━━━━━━━━━━━━\n\n";
    list += "🎌 ANIME / CARTOON:\n";
    for (const k of ["anime", "anime-m", "anime2", "madara", "naruto", "goku", "luffy", "chibi", "waifu"]) {
      list += `  ${k.padEnd(12)} → ${VOICES[k].desc}\n`;
    }
    list += "\n🌟 POPULAR / CELEBRITY:\n";
    for (const k of ["trump", "obama", "biden", "elon", "santa", "news", "movie", "rapper"]) {
      list += `  ${k.padEnd(12)} → ${VOICES[k].desc}\n`;
    }
    list += "\n👤 NORMAL:\n";
    for (const k of ["girl", "boy", "baby", "uk-girl", "uk-boy", "in-girl", "in-boy"]) {
      list += `  ${k.padEnd(12)} → ${VOICES[k].desc}\n`;
    }
    list += "\n🇧🇩 BANGLA / HINDI:\n";
    for (const k of ["bd-girl", "bd-boy", "bn", "hindi", "hindi-boy", "urdu"]) {
      list += `  ${k.padEnd(12)} → ${VOICES[k].desc}\n`;
    }
    list += "\n🌍 OTHERS:\n";
    for (const k of ["kpop", "korean-boy", "chinese", "japanese", "arabic", "spanish", "french", "german", "russian"]) {
      list += `  ${k.padEnd(12)} → ${VOICES[k].desc}\n`;
    }
    list += "\n📝 Usage:\n";
    list += "  Sayo say <text>\n";
    list += "  Sayo say <text> --v anime\n";
    list += "  Sayo say <text> --v madara\n";
    list += "  Sayo say <text> --v girl";
    return list;
  },

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, body } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Build full text from body ═══ */
    let rawText = (body || "").trim();

    /* Remove trigger words */
    rawText = rawText.replace(/^\.?\s*sayo\s+say\s+/i, "")
                     .replace(/^\.?\s*say\s+/i, "")
                     .replace(/^\.?\s*speak\s+/i, "")
                     .trim();

    /* Also try args */
    if (!rawText && args.length) {
      rawText = args.join(" ").trim();
    }

    /* ═══ Voice list request ═══ */
    if (rawText.toLowerCase() === "voices" || rawText.toLowerCase() === "list" || rawText.toLowerCase() === "help") {
      react("📘");
      return api.sendMessage(this.getVoiceList(), threadID);
    }

    if (!rawText) {
      react("❓");
      return api.sendMessage(this.getVoiceList(), threadID);
    }

    /* ═══ Parse --v flag ═══ */
    let voiceKey = null;
    let text = rawText;

    const vMatch = rawText.match(/--v\s+([a-z0-9-]+)/i);
    if (vMatch) {
      voiceKey = vMatch[1].toLowerCase();
      text = rawText.replace(/--v\s+[a-z0-9-]+/i, "").trim();
    }

    /* Auto detect voice from language if no voice set */
    if (!voiceKey) {
      const lang = detectLang(text);
      if (lang === "bn") voiceKey = "bd-girl";
      else if (lang === "hi") voiceKey = "hindi";
      else voiceKey = "girl";
    }

    /* Validate voice key */
    if (!VOICES[voiceKey]) {
      react("❌");
      return api.sendMessage(
        `❌ Voice "${voiceKey}" pawa jay ni\n\n` +
        this.getVoiceList(),
        threadID
      );
    }

    if (text.length > 500) text = text.slice(0, 500);

    react("⏳");
    console.log(`[say] voice=${voiceKey} text="${text.slice(0, 40)}"`);

    const tmpFile = path.join(os.tmpdir(), `say_${Date.now()}_${senderID}.mp3`);
    const selectedVoice = VOICES[voiceKey].voice;

    try {
      /* Try edge-tts first */
      let buf = await generateVoice(text, selectedVoice, tmpFile);

      /* Fallback to Google */
      if (!buf) {
        buf = await googleTTS(text, detectLang(text));
      }

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
        if (err) react("❌");
        else react("✅");
      });

    } catch (e) {
      console.log("[say] error: " + e.message);
      try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (_) {}
      react("❌");
      api.sendMessage("❌ " + e.message.slice(0, 60), threadID);
    }
  }
};