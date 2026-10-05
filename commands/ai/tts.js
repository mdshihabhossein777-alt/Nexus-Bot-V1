/**
 * commands/ai/tts.js
 * NEXUS BOT V1 — Text to Voice (multi-provider, non-fail)
 * © 2026
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const axios = require("axios");

/* ═══════════════════════════════════════════════════════════════════
   COOLDOWN
   ═══════════════════════════════════════════════════════════════════ */
const cooldowns = new Map();
const COOLDOWN_MS = 30 * 1000;

/* ═══════════════════════════════════════════════════════════════════
   VOICE PRESETS (edge-tts neural voices)
   ═══════════════════════════════════════════════════════════════════ */
const VOICE_PRESETS = {
  /* Shortcuts */
  "bn":       "bn-BD-NabanitaNeural",       /* Bengali female */
  "bn-f":     "bn-BD-NabanitaNeural",
  "bn-m":     "bn-BD-PradeepNeural",
  "bn-in":    "bn-IN-TanishaaNeural",

  "en":       "en-US-AriaNeural",
  "en-f":     "en-US-AriaNeural",
  "en-m":     "en-US-GuyNeural",
  "en-gb":    "en-GB-SoniaNeural",
  "en-gb-m":  "en-GB-RyanNeural",
  "en-au":    "en-AU-NatashaNeural",
  "en-in":    "en-IN-NeerjaNeural",

  "hi":       "hi-IN-SwaraNeural",
  "hi-f":     "hi-IN-SwaraNeural",
  "hi-m":     "hi-IN-MadhurNeural",

  "ur":       "ur-PK-UzmaNeural",
  "ar":       "ar-SA-ZariyahNeural",
  "ar-m":     "ar-SA-HamedNeural",
  "es":       "es-ES-ElviraNeural",
  "fr":       "fr-FR-DeniseNeural",
  "de":       "de-DE-KatjaNeural",
  "it":       "it-IT-ElsaNeural",
  "pt":       "pt-BR-FranciscaNeural",
  "ru":       "ru-RU-SvetlanaNeural",
  "ja":       "ja-JP-NanamiNeural",
  "ja-m":     "ja-JP-KeitaNeural",
  "ko":       "ko-KR-SunHiNeural",
  "zh":       "zh-CN-XiaoxiaoNeural",
  "tr":       "tr-TR-EmelNeural",
  "id":       "id-ID-GadisNeural",
  "th":       "th-TH-PremwadeeNeural",
  "vi":       "vi-VN-HoaiMyNeural",
  "ta":       "ta-IN-PallaviNeural",
  "te":       "te-IN-ShrutiNeural",
  "ml":       "ml-IN-SobhanaNeural"
};

/* StreamElements voices */
const SE_VOICES = {
  "se-brian":   "Brian",
  "se-amy":     "Amy",
  "se-emma":    "Emma",
  "se-joanna":  "Joanna",
  "se-matthew": "Matthew",
  "se-justin":  "Justin",
  "se-ivy":     "Ivy",
  "se-salli":   "Salli",
  "se-joey":    "Joey",
  "se-trump":   "Trump",
  "se-obama":   "Obama",
  "se-santa":   "Santa",
  "se-biden":   "Biden"
};

/* ═══════════════════════════════════════════════════════════════════
   LANGUAGE AUTO-DETECT (Bengali unicode)
   ═══════════════════════════════════════════════════════════════════ */
function detectLang(text) {
  /* Bengali unicode range */
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  /* Arabic/Urdu */
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  /* Hindi/Devanagari */
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  /* Japanese */
  if (/[\u3040-\u30FF]/.test(text)) return "ja";
  /* Korean */
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko";
  /* Chinese */
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  /* Cyrillic */
  if (/[\u0400-\u04FF]/.test(text)) return "ru";
  /* Default English */
  return "en";
}

/* ═══════════════════════════════════════════════════════════════════
   AUDIO VALIDATOR
   ═══════════════════════════════════════════════════════════════════ */
function isAudioBuffer(buf) {
  if (!buf || buf.length < 500) return false;
  const s3 = buf.slice(0, 3).toString();
  const s4 = buf.slice(0, 4).toString();
  /* MP3: ID3 or frame sync */
  if (s3 === "ID3") return true;
  if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return true;
  /* WAV */
  if (s4 === "RIFF") return true;
  /* OGG */
  if (s4 === "OggS") return true;
  /* M4A */
  if (buf.slice(4, 8).toString() === "ftyp") return true;
  /* WEBM (has EBML header) */
  if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) return true;
  return false;
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 1: edge-tts package (BEST quality)
   ═══════════════════════════════════════════════════════════════════ */
async function tryEdgeTTS(text, voice, outPath) {
  /* Try msedge-tts first (v2.x) */
  try {
    const msedge = require("msedge-tts");
    const MsEdgeTTS = msedge.MsEdgeTTS || msedge.default;
    if (MsEdgeTTS) {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, "audio-24khz-48kbitrate-mono-mp3");
      const { audioStream } = await tts.toStream(text);

      const chunks = [];
      await new Promise((resolve, reject) => {
        audioStream.on("data", (c) => chunks.push(c));
        audioStream.on("end", resolve);
        audioStream.on("error", reject);
        setTimeout(() => reject(new Error("edge-tts timeout")), 60000);
      });

      const buffer = Buffer.concat(chunks);
      if (isAudioBuffer(buffer)) {
        console.log("[tts] ✅ msedge-tts");
        return buffer;
      }
    }
  } catch (e) {
    console.log("[tts] msedge-tts err:", e.message);
  }

  /* Try edge-tts (v1.x) */
  try {
    const mod = require("edge-tts");
    const EdgeTTS = mod.EdgeTTS || mod.default;

    if (EdgeTTS) {
      const tts = new EdgeTTS(text, voice);

      if (typeof tts.toBuffer === "function") {
        const buffer = await tts.toBuffer();
        if (isAudioBuffer(buffer)) {
          console.log("[tts] ✅ edge-tts (toBuffer)");
          return buffer;
        }
      }

      if (typeof tts.toFile === "function") {
        await tts.toFile(outPath);
        if (fs.existsSync(outPath)) {
          const buffer = fs.readFileSync(outPath);
          try { fs.unlinkSync(outPath); } catch (_) {}
          if (isAudioBuffer(buffer)) {
            console.log("[tts] ✅ edge-tts (toFile)");
            return buffer;
          }
        }
      }
    }
  } catch (e) {
    console.log("[tts] edge-tts err:", e.message);
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 2: StreamElements (celebrity + natural voices)
   ═══════════════════════════════════════════════════════════════════ */
async function tryStreamElements(text, voice) {
  try {
    const url = `https://api.streamelements.com/kappa/v2/speech`;
    const r = await axios.get(url, {
      params: { voice, text },
      responseType: "arraybuffer",
      timeout: 25000,
      maxContentLength: 10 * 1024 * 1024,
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const buf = Buffer.from(r.data);
    if (isAudioBuffer(buf)) {
      console.log(`[tts] ✅ StreamElements (${voice})`);
      return buf;
    }
    console.log(`[tts] StreamElements invalid (${buf.length} bytes)`);
  } catch (e) {
    console.log("[tts] StreamElements err:", e.message);
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 3: Google Translate TTS (always works, 200 char limit)
   ═══════════════════════════════════════════════════════════════════ */
async function tryGoogleTTS(text, lang) {
  /* Google limit: 200 chars per request — split if needed */
  const maxLen = 190;
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0 && chunks.length < 10) {
    chunks.push(remaining.slice(0, maxLen));
    remaining = remaining.slice(maxLen);
  }

  const buffers = [];

  for (const chunk of chunks) {
    try {
      const url =
        `https://translate.google.com/translate_tts` +
        `?ie=UTF-8` +
        `&q=${encodeURIComponent(chunk)}` +
        `&tl=${lang}` +
        `&total=1&idx=0&textlen=${chunk.length}` +
        `&client=tw-ob&prev=input&ttsspeed=0.9`;

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
      if (isAudioBuffer(buf)) buffers.push(buf);
    } catch (e) {
      console.log(`[tts] Google chunk err: ${e.message}`);
    }
  }

  if (buffers.length) {
    console.log(`[tts] ✅ Google TTS (${buffers.length} chunk)`);
    return Buffer.concat(buffers);
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   MASTER
   ═══════════════════════════════════════════════════════════════════ */
async function generateVoice(text, voiceShortcut, seVoice, detectedLang, outPath) {
  /* Provider 1: edge-tts (best quality) */
  if (voiceShortcut) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const buf = await tryEdgeTTS(text, voiceShortcut, outPath);
      if (buf) return buf;
    }
  }

  /* Provider 2: StreamElements */
  if (seVoice) {
    const buf = await tryStreamElements(text, seVoice);
    if (buf) return buf;
  }

  /* Default SE fallback (Brian) */
  const seFallback = await tryStreamElements(text, "Brian");
  if (seFallback) return seFallback;

  /* Provider 3: Google TTS */
  const gBuf = await tryGoogleTTS(text, detectedLang || "en");
  if (gBuf) return gBuf;

  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════════════ */
module.exports = {
  name: "tts",
  aliases: ["say", "voice", "speak"],
  version: "3.0.0",
  role: 0,
  description: "Text to voice (multi-provider, 30+ voices)",
  usage: "/tts [voice] <text>",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, body, messageReply } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    const isOwner =
      String(senderID) === String(config.ownerID) ||
      (config.adminIDs || []).map(String).includes(String(senderID));

    /* ═══ Help check: /tts (no args) ═══ */
    let rawArgs = (args || []).slice();

    /* Extract from body if empty */
    if (!rawArgs.length && body) {
      const prefix = config.prefix || "/";
      let raw = body.trim();
      if (raw.startsWith(prefix)) raw = raw.slice(prefix.length).trim();
      raw = raw.replace(/^(tts|say|voice|speak)\s+/i, "").trim();
      rawArgs = raw ? raw.split(/\s+/) : [];
    }

    /* Show help if nothing */
    if (!rawArgs.length && !messageReply) {
      react("❓");
      return api.sendMessage(
        `🔊 TEXT TO VOICE\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📌 Usage:\n` +
        `• /tts <text>\n` +
        `• /tts <voice> <text>\n` +
        `• Reply to text + /tts\n\n` +
        `🎤 Voices:\n` +
        `🇧🇩 bn • bn-m • bn-f\n` +
        `🇬🇧 en • en-m • en-f • en-gb\n` +
        `🇮🇳 hi • hi-m\n` +
        `🇯🇵 ja • ko • zh • ar • ur\n` +
        `🎭 trump • obama • biden • santa\n\n` +
        `📝 Example:\n` +
        `/tts bn-m Ami valo achi\n` +
        `/tts trump Hello world`,
        threadID
      );
    }

    /* ═══ Cooldown (owner unlimited) ═══ */
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

    /* ═══ Parse voice + text ═══ */
    let voiceShortcut = null;
    let seVoice = null;
    let text = rawArgs.join(" ").trim();

    const firstLower = (rawArgs[0] || "").toLowerCase();

    /* Check SE voices with "se-" or direct name */
    if (SE_VOICES[firstLower]) {
      seVoice = SE_VOICES[firstLower];
      text = rawArgs.slice(1).join(" ").trim();
    } else if (SE_VOICES["se-" + firstLower]) {
      seVoice = SE_VOICES["se-" + firstLower];
      text = rawArgs.slice(1).join(" ").trim();
    }
    /* Check edge-tts presets */
    else if (VOICE_PRESETS[firstLower]) {
      voiceShortcut = VOICE_PRESETS[firstLower];
      text = rawArgs.slice(1).join(" ").trim();
    }
    /* Check full neural voice name (e.g., en-US-AriaNeural) */
    else if (/^[a-z]{2}-[A-Z]{2}-\w+Neural$/.test(rawArgs[0])) {
      voiceShortcut = rawArgs[0];
      text = rawArgs.slice(1).join(" ").trim();
    }

    /* ═══ If still no text, try reply ═══ */
    if (!text && messageReply && messageReply.body) {
      text = String(messageReply.body).trim();
    }

    if (!text) {
      react("❓");
      return api.sendMessage(`❌ Provide text: /tts <text>`, threadID);
    }

    /* Length guard */
    if (text.length > 4000) text = text.slice(0, 4000);

    react("⏳");

    /* ═══ Auto voice if none specified ═══ */
    const detectedLang = detectLang(text);
    if (!voiceShortcut && !seVoice) {
      /* Use detected language preset */
      voiceShortcut = VOICE_PRESETS[detectedLang] || VOICE_PRESETS["en"];
    }

    console.log(`[tts] voice=${voiceShortcut || seVoice} lang=${detectedLang} len=${text.length}`);

    /* ═══ Generate ═══ */
    const cacheDir = path.join(os.tmpdir(), "nexus_tts");
    fs.ensureDirSync(cacheDir);
    const filePath = path.join(cacheDir, `tts_${Date.now()}_${senderID}.mp3`);

    try {
      const buffer = await generateVoice(
        text,
        voiceShortcut,
        seVoice,
        detectedLang,
        filePath
      );

      if (!buffer || buffer.length < 500) {
        throw new Error("all TTS providers failed");
      }

      await fs.writeFile(filePath, buffer);

      api.sendMessage({
        body: "",
        attachment: fs.createReadStream(filePath)
      }, threadID, (err) => {
        try { fs.unlinkSync(filePath); } catch (_) {}
        if (err) console.error("[tts] send err:", err.message);
      });

      react("✅");

    } catch (e) {
      console.error("[tts] error:", e.message);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}

      let errLine = e.message;
      if (e.message.includes("timeout")) errLine = "network timeout — try again";
      else if (e.message.includes("all TTS")) errLine = "all TTS providers failed — try again";
      else if (e.message.includes("ENOTFOUND")) errLine = "network unreachable";
      else errLine = e.message.slice(0, 100);

      react("❌");
      return api.sendMessage(`❌ ${errLine}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1