/**
 * commands/ai/shout.js
 * NEXUS BOT V1 — Shout voice (loud TTS)
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const axios = require("axios");

const VOICES = {
  "bn":   "bn-BD-NabanitaNeural",
  "en":   "en-US-AriaNeural",
  "en-m": "en-US-GuyNeural",
  "hi":   "hi-IN-SwaraNeural"
};

function detectLang(t) {
  if (/[\u0980-\u09FF]/.test(t)) return "bn";
  if (/[\u0900-\u097F]/.test(t)) return "hi";
  return "en";
}

async function tryEdge(text, voice, outPath) {
  try {
    const mod = require("edge-tts");
    const EdgeTTS = mod.EdgeTTS || mod.default;
    const tts = new EdgeTTS();
    await tts.synthesize(text, voice, outPath);
    if (fs.existsSync(outPath)) {
      const buf = fs.readFileSync(outPath);
      if (buf.length > 500) return buf;
    }
  } catch (_) {}
  return null;
}

async function tryGoogle(text, lang) {
  try {
    const url = "https://translate.google.com/translate_tts" +
      "?ie=UTF-8&q=" + encodeURIComponent(text.slice(0, 180)) +
      "&tl=" + lang + "&client=tw-ob";
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://translate.google.com/"
      }
    });
    const buf = Buffer.from(r.data);
    if (buf.length > 500) return buf;
  } catch (_) {}
  return null;
}

module.exports = {
  name: "shout",
  aliases: ["scream", "yell", "chitkar"],
  version: "1.0.0",
  role: 0,
  description: "Loud shout TTS",
  usage: "/shout <text>",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, body, messageReply } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    let rawArgs = (args || []).slice();
    if (!rawArgs.length && body) {
      const prefix = config.prefix || "/";
      let raw = body.trim();
      if (raw.startsWith(prefix)) raw = raw.slice(prefix.length).trim();
      raw = raw.replace(/^(shout|scream|yell|chitkar)\s+/i, "").trim();
      rawArgs = raw ? raw.split(/\s+/) : [];
    }

    let voiceKey = null;
    let text = rawArgs.join(" ").trim();

    if (rawArgs[0] && VOICES[rawArgs[0].toLowerCase()]) {
      voiceKey = rawArgs[0].toLowerCase();
      text = rawArgs.slice(1).join(" ").trim();
    }

    if (!text && messageReply && messageReply.body) {
      text = String(messageReply.body).trim();
    }

    if (!text) {
      react("❓");
      return api.sendMessage("📢 Usage: /shout <text>", threadID);
    }

    if (text.length > 200) text = text.slice(0, 200);

    /* ═══ Convert to shout ═══ */
    const shoutText = text.toUpperCase().split(" ").join("! ") + "!";

    react("📢");

    const lang = detectLang(text);
    const voice = voiceKey ? VOICES[voiceKey] : (VOICES[lang] || VOICES["en"]);
    const tmpFile = path.join(os.tmpdir(), `shout_${Date.now()}_${senderID}.mp3`);

    try {
      let buf = await tryEdge(shoutText, voice, tmpFile);
      if (!buf) buf = await tryGoogle(shoutText, lang);

      if (!buf || buf.length < 500) {
        react("❌");
        return api.sendMessage("❌ Shout fail", threadID);
      }

      await fs.writeFile(tmpFile, buf);

      api.sendMessage({
        body: "📢 " + text.slice(0, 50),
        attachment: fs.createReadStream(tmpFile)
      }, threadID, (err) => {
        try { fs.unlinkSync(tmpFile); } catch (_) {}
        if (err) { react("❌"); } else { react("📢"); }
      });

    } catch (e) {
      try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (_) {}
      react("❌");
    }
  }
};