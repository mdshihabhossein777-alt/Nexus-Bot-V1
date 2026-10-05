/**
 * commands/ai/say.js
 * NEXUS BOT V1 — Text to Voice (multi-provider + Groq AI)
 * © 2026
 */

"use strict";

/* ═══ Safe requires ═══ */
let fs, path, os, axios;
try { fs = require("fs-extra"); } catch (_) {}
try { path = require("path"); } catch (_) {}
try { os = require("os"); } catch (_) {}
try { axios = require("axios"); } catch (_) {}

const log  = (...a) => console.log("[say]", ...a);
const warn = (...a) => console.warn("[say]", ...a);

/* ═══ Cooldown ═══ */
const cooldowns = new Map();
const COOLDOWN_MS = 15 * 1000;

/* ═══ edge-tts Voice Presets ═══ */
const VOICE_PRESETS = {
  /* Bengali */
  "bn":       "bn-BD-NabanitaNeural",
  "bn-f":     "bn-BD-NabanitaNeural",
  "bn-m":     "bn-BD-PradeepNeural",
  "bn-in":    "bn-IN-TanishaaNeural",
  /* English */
  "en":       "en-US-AriaNeural",
  "en-f":     "en-US-AriaNeural",
  "en-m":     "en-US-GuyNeural",
  "en-gb":    "en-GB-SoniaNeural",
  "en-gb-m":  "en-GB-RyanNeural",
  "en-au":    "en-AU-NatashaNeural",
  "en-in":    "en-IN-NeerjaNeural",
  /* Hindi/Urdu */
  "hi":       "hi-IN-SwaraNeural",
  "hi-f":     "hi-IN-SwaraNeural",
  "hi-m":     "hi-IN-MadhurNeural",
  "ur":       "ur-PK-UzmaNeural",
  /* Arabic */
  "ar":       "ar-SA-ZariyahNeural",
  "ar-m":     "ar-SA-HamedNeural",
  /* European */
  "es":       "es-ES-ElviraNeural",
  "fr":       "fr-FR-DeniseNeural",
  "de":       "de-DE-KatjaNeural",
  "it":       "it-IT-ElsaNeural",
  "pt":       "pt-BR-FranciscaNeural",
  "ru":       "ru-RU-SvetlanaNeural",
  /* Asian */
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

/* ═══ StreamElements Voices ═══ */
const SE_VOICES = {
  "brian":   "Brian",   "amy":   "Amy",   "emma": "Emma",
  "joanna":  "Joanna",  "matthew": "Matthew", "justin": "Justin",
  "ivy":     "Ivy",     "salli": "Salli", "joey": "Joey",
  "trump":   "Trump",   "obama": "Obama", "santa": "Santa",
  "biden":   "Biden"
};

/* ═══ Groq key loader ═══ */
function getGroqKey() {
  try {
    const kf = path.join(__dirname, "..", "..", "data", "groq_key.txt");
    if (fs.existsSync(kf)) {
      const k = fs.readFileSync(kf, "utf8").trim();
      if (k && k.startsWith("gsk_")) return k;
    }
  } catch (_) {}
  const env = process.env.GROQ_API_KEY || process.env.GROQ_KEY;
  if (env && env.startsWith("gsk_")) return env;
  return null;
}

/* ═══ Groq translate/text-enhance ═══ */
async function groqText(text, targetLang) {
  const key = getGroqKey();
  if (!key) return null;

  const models = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "meta-llama/llama-4-scout-17b-16e-instruct"
  ];

  const langNames = {
    bn: "Bengali (Bangla)", en: "English", hi: "Hindi", ur: "Urdu",
    ar: "Arabic", es: "Spanish", fr: "French", de: "German",
    ja: "Japanese", ko: "Korean", zh: "Chinese", ru: "Russian",
    it: "Italian", pt: "Portuguese", tr: "Turkish", th: "Thai",
    vi: "Vietnamese", id: "Indonesian", ta: "Tamil", te: "Telugu",
    ml: "Malayalam"
  };

  const targetName = langNames[targetLang] || "English";

  for (const model of models) {
    try {
      const r = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model,
          messages: [
            {
              role: "system",
              content:
                `You are a text processor for TTS. ` +
                `Translate and rewrite the text into ${targetName}. ` +
                `Keep the meaning. Remove emojis and symbols. ` +
                `Make it natural for reading aloud. ` +
                `Reply with ONLY the final text, no quotes, no explanation.`
            },
            { role: "user", content: text }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          timeout: 20000
        }
      );

      const content = r.data?.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        log(`groq: ${model} ✓`);
        return content.trim().replace(/^["']|["']$/g, "");
      }
    } catch (e) {
      warn(`groq ${model}: ${e.message.slice(0, 50)}`);
    }
  }
  return null;
}

/* ═══ Language detect from unicode ═══ */
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

/* ═══ Audio magic bytes check ═══ */
function isAudioBuffer(buf) {
  if (!buf || buf.length < 500) return false;
  const s3 = buf.slice(0, 3).toString();
  const s4 = buf.slice(0, 4).toString();
  if (s3 === "ID3") return true;
  if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return true;
  if (s4 === "RIFF") return true;
  if (s4 === "OggS") return true;
  if (buf.slice(4, 8).toString() === "ftyp") return true;
  if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) return true;
  return false;
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 1 — msedge-tts (best quality)
   ═══════════════════════════════════════════════════════════════════ */
async function tryMsEdgeTTS(text, voice) {
  let msedge;
  try { msedge = require("msedge-tts"); } catch (_) { return null; }

  const MsEdgeTTS = msedge.MsEdgeTTS || msedge.default;
  if (!MsEdgeTTS) return null;

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, "audio-24khz-48kbitrate-mono-mp3");
    const { audioStream } = await tts.toStream(text);

    const chunks = [];
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), 45000);
      audioStream.on("data", (c) => chunks.push(c));
      audioStream.on("end", () => { clearTimeout(timer); resolve(); });
      audioStream.on("error", (e) => { clearTimeout(timer); reject(e); });
    });

    const buffer = Buffer.concat(chunks);
    if (isAudioBuffer(buffer)) {
      log("✅ msedge-tts");
      return buffer;
    }
  } catch (e) {
    warn("msedge-tts: " + e.message.slice(0, 50));
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 2 — edge-tts (v1.x)
   ═══════════════════════════════════════════════════════════════════ */
async function tryEdgeTTS(text, voice, outPath) {
  let mod;
  try { mod = require("edge-tts"); } catch (_) { return null; }

  const EdgeTTS = mod.EdgeTTS || mod.default;
  if (!EdgeTTS) return null;

  try {
    const tts = new EdgeTTS(text, voice);

    if (typeof tts.toBuffer === "function") {
      const buffer = await tts.toBuffer();
      if (isAudioBuffer(buffer)) {
        log("✅ edge-tts (toBuffer)");
        return buffer;
      }
    }

    if (typeof tts.toFile === "function" && outPath) {
      await tts.toFile(outPath);
      if (fs.existsSync(outPath)) {
        const buffer = fs.readFileSync(outPath);
        try { fs.unlinkSync(outPath); } catch (_) {}
        if (isAudioBuffer(buffer)) {
          log("✅ edge-tts (toFile)");
          return buffer;
        }
      }
    }
  } catch (e) {
    warn("edge-tts: " + e.message.slice(0, 50));
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 3 — StreamElements
   ═══════════════════════════════════════════════════════════════════ */
async function tryStreamElements(text, voice) {
  try {
    const r = await axios.get("https://api.streamelements.com/kappa/v2/speech", {
      params: { voice, text },
      responseType: "arraybuffer",
      timeout: 25000,
      maxContentLength: 10 * 1024 * 1024,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    const buf = Buffer.from(r.data);
    if (isAudioBuffer(buf)) {
      log(`✅ StreamElements (${voice})`);
      return buf;
    }
  } catch (e) {
    warn("SE: " + e.message.slice(0, 50));
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 4 — Google Translate TTS (splits 190 chars)
   ═══════════════════════════════════════════════════════════════════ */
async function tryGoogleTTS(text, lang) {
  const maxLen = 190;
  const parts = [];
  let remaining = text;

  while (remaining.length > 0 && parts.length < 12) {
    let chunk = remaining.slice(0, maxLen);
    const lastSpace = chunk.lastIndexOf(" ");
    if (lastSpace > 100 && remaining.length > maxLen) {
      chunk = chunk.slice(0, lastSpace);
    }
    parts.push(chunk);
    remaining = remaining.slice(chunk.length).trim();
  }

  const buffers = [];

  for (const chunk of parts) {
    try {
      const url =
        "https://translate.google.com/translate_tts" +
        "?ie=UTF-8" +
        "&q=" + encodeURIComponent(chunk) +
        "&tl=" + (lang || "en") +
        "&total=1&idx=0&textlen=" + chunk.length +
        "&client=tw-ob&prev=input&ttsspeed=0.9";

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
    } catch (_) {}
  }

  if (buffers.length) {
    log(`✅ Google TTS (${buffers.length} chunks)`);
    return Buffer.concat(buffers);
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 5 — VoiceRSS (backup)
   ═══════════════════════════════════════════════════════════════════ */
async function tryVoiceRSS(text, lang) {
  const key = process.env.VOICERSS_KEY;
  if (!key) return null;
  try {
    const r = await axios.get("https://api.voicerss.org/", {
      params: {
        key,
        hl: lang || "en-us",
        src: text.slice(0, 500),
        c: "MP3"
      },
      responseType: "arraybuffer",
      timeout: 20000
    });
    const buf = Buffer.from(r.data);
    if (isAudioBuffer(buf)) {
      log("✅ VoiceRSS");
      return buf;
    }
  } catch (_) {}
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   MASTER GENERATOR
   ═══════════════════════════════════════════════════════════════════ */
async function generateVoice(text, voiceShortcut, seVoice, lang, outPath) {
  /* Provider 1: msedge-tts */
  if (voiceShortcut) {
    const b1 = await tryMsEdgeTTS(text, voiceShortcut);
    if (b1) return b1;
  }

  /* Provider 2: edge-tts */
  if (voiceShortcut) {
    const b2 = await tryEdgeTTS(text, voiceShortcut, outPath);
    if (b2) return b2;
  }

  /* Provider 3: StreamElements */
  if (seVoice) {
    const b3 = await tryStreamElements(text, seVoice);
    if (b3) return b3;
  }
  const b3b = await tryStreamElements(text, "Brian");
  if (b3b) return b3b;

  /* Provider 4: Google Translate */
  const b4 = await tryGoogleTTS(text, lang);
  if (b4) return b4;

  /* Provider 5: VoiceRSS */
  const b5 = await tryVoiceRSS(text, lang);
  if (b5) return b5;

  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN MODULE
   ═══════════════════════════════════════════════════════════════════ */
module.exports = {
  name: "say",
  aliases: ["tts", "voice", "speak"],
  version: "4.0.0",
  role: 0,
  description: "Text to voice (multi-provider, 40+ voices, Groq AI)",
  usage: "/say [voice] <text>",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, body, messageReply } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Safe exit if deps missing ═══ */
    if (!fs || !path || !os || !axios) {
      react("❌");
      return;
    }

    const isOwner =
      String(senderID) === String(config.ownerID) ||
      (config.adminIDs || []).map(String).includes(String(senderID));

    /* ═══ Extract args ═══ */
    let rawArgs = (args || []).slice();

    if (!rawArgs.length && body) {
      const prefix = config.prefix || "/";
      let raw = body.trim();
      if (raw.startsWith(prefix)) raw = raw.slice(prefix.length).trim();
      raw = raw.replace(/^(say|tts|voice|speak)\s+/i, "").trim();
      rawArgs = raw ? raw.split(/\s+/) : [];
    }

    /* ═══ If no text at all → silent ❓ ═══ */
    if (!rawArgs.length && !(messageReply && messageReply.body)) {
      react("❓");
      return;
    }

    /* ═══ Cooldown (owner unlimited) ═══ */
    if (!isOwner) {
      const last = cooldowns.get(String(senderID)) || 0;
      const remain = COOLDOWN_MS - (Date.now() - last);
      if (remain > 0) {
        react("⏳");
        return;
      }
      cooldowns.set(String(senderID), Date.now());
      if (cooldowns.size > 5000) cooldowns.clear();
    }

    /* ═══ Parse voice + text ═══ */
    let voiceShortcut = null;
    let seVoice = null;
    let text = rawArgs.join(" ").trim();

    const firstLower = (rawArgs[0] || "").toLowerCase();

    /* StreamElements */
    if (SE_VOICES[firstLower]) {
      seVoice = SE_VOICES[firstLower];
      text = rawArgs.slice(1).join(" ").trim();
    }
    /* edge-tts preset */
    else if (VOICE_PRESETS[firstLower]) {
      voiceShortcut = VOICE_PRESETS[firstLower];
      text = rawArgs.slice(1).join(" ").trim();
    }
    /* Full neural voice name */
    else if (/^[a-z]{2}-[A-Z]{2}-\w+Neural$/i.test(rawArgs[0])) {
      voiceShortcut = rawArgs[0];
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

    /* Length limit */
    if (text.length > 3000) text = text.slice(0, 3000);

    react("⏳");

    /* ═══ Auto voice from lang ═══ */
    const detectedLang = detectLang(text);
    if (!voiceShortcut && !seVoice) {
      voiceShortcut = VOICE_PRESETS[detectedLang] || VOICE_PRESETS["en"];
    }

    /* ═══ Groq AI text processing (translate + clean) ═══ */
    let finalText = text;
    const groqKey = getGroqKey();
    if (groqKey && voiceShortcut) {
      /* Extract lang code from voice (e.g., "bn-BD-NabanitaNeural" → "bn") */
      const voiceLang = (voiceShortcut.match(/^([a-z]{2})-/i) || [])[1] || detectedLang;
      if (voiceLang !== detectedLang || /[^\w\s\u0980-\u09FF.,!?]/u.test(text)) {
        try {
          const processed = await groqText(text, voiceLang);
          if (processed && processed.length > 0) {
            finalText = processed;
            log(`groq processed: ${finalText.slice(0, 60)}`);
          }
        } catch (_) {}
      }
    }

    /* ═══ Generate audio ═══ */
    const cacheDir = path.join(os.tmpdir(), "nexus_say");
    fs.ensureDirSync(cacheDir);
    const filePath = path.join(cacheDir, `say_${Date.now()}_${senderID}.mp3`);

    try {
      const buffer = await generateVoice(
        finalText,
        voiceShortcut,
        seVoice,
        detectedLang,
        filePath
      );

      if (!buffer || buffer.length < 500) {
        react("❌");
        return;
      }

      await fs.writeFile(filePath, buffer);

      api.sendMessage({
        body: "",
        attachment: fs.createReadStream(filePath)
      }, threadID, (err) => {
        try { fs.unlinkSync(filePath); } catch (_) {}
        if (err) {
          warn("send err:", err.message);
          react("❌");
        } else {
          react("✅");
        }
      });

    } catch (e) {
      warn("generate err:", e.message);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (_) {}
      react("❌");
    }
  }
};

// © 2026 NEXUS BOT V1