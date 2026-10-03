/**
 * commands/ai/trans.js
 * NEXUS BOT V1 — Auto-detect and translate text
 * © 2026
 */

const axios = require("axios");

/* ═══ Common language codes ═══ */
const LANGS = {
  en: "English", bn: "Bengali", hi: "Hindi", ur: "Urdu",
  ar: "Arabic", es: "Spanish", fr: "French", de: "German",
  ja: "Japanese", ko: "Korean", zh: "Chinese", ru: "Russian",
  pt: "Portuguese", it: "Italian", tr: "Turkish", th: "Thai",
  vi: "Vietnamese", id: "Indonesian", ms: "Malay", nl: "Dutch",
  pl: "Polish", sv: "Swedish", ta: "Tamil", te: "Telugu",
  ml: "Malayalam", kn: "Kannada", gu: "Gujarati", mr: "Marathi",
  pa: "Punjabi", ne: "Nepali", si: "Sinhala", my: "Burmese"
};

module.exports = {
  name: "trans",
  aliases: ["tr", "tr2", "translate"],
  version: "1.1.0",
  role: 0,
  description: "Auto-detect and translate text",
  usage: "/trans <text>  OR  /trans <lang> <text>",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    let target = "en";        /* default: English */
    let text = args.join(" ").trim();

    /* ═══ Check if first arg is a language code ═══ */
    if (args[0] && LANGS[args[0].toLowerCase()]) {
      target = args[0].toLowerCase();
      text = args.slice(1).join(" ").trim();
    }

    if (!text) {
      react("❓");
      return api.sendMessage(
        `Usage:\n` +
        `• /trans <text> — translate to English\n` +
        `• /trans <lang> <text> — translate to specific language\n\n` +
        `Example: /trans bn Hello world`,
        threadID
      );
    }

    react("⏳");

    try {
      /* ═══ Try MyMemory first ═══ */
      let translated = null;
      let detectedLang = null;

      try {
        const r = await axios.get("https://api.mymemory.translated.net/get", {
          params: { q: text, langpair: `auto|${target}` },
          timeout: 15000,
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        translated = r.data?.responseData?.translatedText;
        /* MyMemory sometimes returns error inside responseData */
        if (translated && translated.toUpperCase().includes("MYMEMORY WARNING")) {
          translated = null;
        }
      } catch (_) {}

      /* ═══ Fallback: Google Translate free endpoint ═══ */
      if (!translated) {
        try {
          const r = await axios.get(
            `https://translate.googleapis.com/translate_a/single`,
            {
              params: {
                client: "gtx",
                sl: "auto",
                tl: target,
                dt: "t",
                q: text
              },
              timeout: 15000,
              headers: { "User-Agent": "Mozilla/5.0" }
            }
          );
          /* Response format: [[[translated, original, null, null, ...]], ...] */
          const arr = r.data?.[0] || [];
          translated = arr.map((seg) => seg?.[0] || "").join("");
          detectedLang = r.data?.[2] || null;
        } catch (_) {}
      }

      if (!translated || !translated.trim()) {
        throw new Error("translation unavailable");
      }

      translated = translated.trim();
      if (translated.length > 900) translated = translated.slice(0, 897) + "...";

      const langName = LANGS[target] || target.toUpperCase();

      react("✅");

      let reply = `🌐 ${translated}`;
      if (detectedLang && detectedLang !== target) {
        const fromName = LANGS[detectedLang] || detectedLang.toUpperCase();
        reply = `🌐 ${fromName} → ${langName}:\n\n${translated}`;
      }

      return api.sendMessage(reply, threadID);

    } catch (e) {
      console.error("[trans] error:", e.message);

      let errLine = "unknown error";
      if (e.message.includes("timeout")) errLine = "network timeout";
      else if (e.message.includes("unavailable")) errLine = "translation service down";
      else if (e.message.includes("ENOTFOUND")) errLine = "network unreachable";
      else errLine = e.message.slice(0, 60);

      react("❌");
      api.sendMessage(`❌ ${errLine}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1