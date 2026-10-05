/**
 * commands/ai/trans.js
 * NEXUS BOT V1 — Auto-detect + translate (multi-source)
 * © 2026
 */

"use strict";

const axios = require("axios");

/* ═══════════════════════════════════════════════════════════════════
   LANGUAGE MAP
   ═══════════════════════════════════════════════════════════════════ */
const LANGS = {
  en: "English", bn: "Bengali", hi: "Hindi", ur: "Urdu",
  ar: "Arabic", es: "Spanish", fr: "French", de: "German",
  ja: "Japanese", ko: "Korean", zh: "Chinese", ru: "Russian",
  pt: "Portuguese", it: "Italian", tr: "Turkish", th: "Thai",
  vi: "Vietnamese", id: "Indonesian", ms: "Malay", nl: "Dutch",
  pl: "Polish", sv: "Swedish", ta: "Tamil", te: "Telugu",
  ml: "Malayalam", kn: "Kannada", gu: "Gujarati", mr: "Marathi",
  pa: "Punjabi", ne: "Nepali", si: "Sinhala", my: "Burmese",
  fa: "Persian", he: "Hebrew", uk: "Ukrainian", cs: "Czech",
  da: "Danish", fi: "Finnish", no: "Norwegian", ro: "Romanian",
  hu: "Hungarian", el: "Greek", bg: "Bulgarian", hr: "Croatian",
  sk: "Slovak", sl: "Slovenian", lt: "Lithuanian", lv: "Latvian",
  et: "Estonian", sr: "Serbian", bs: "Bosnian", mk: "Macedonian",
  sq: "Albanian", az: "Azerbaijani", ka: "Georgian", hy: "Armenian",
  kk: "Kazakh", uz: "Uzbek", af: "Afrikaans", sw: "Swahili",
  am: "Amharic", yo: "Yoruba", ha: "Hausa", ig: "Igbo",
  so: "Somali", zu: "Zulu", fil: "Filipino", km: "Khmer",
  lo: "Lao", mn: "Mongolian", ps: "Pashto", sd: "Sindhi"
};

/* Reverse lookup: name → code (e.g. "bengali" → "bn") */
const NAME_TO_CODE = {};
for (const [code, name] of Object.entries(LANGS)) {
  NAME_TO_CODE[name.toLowerCase()] = code;
}

function resolveLang(input) {
  if (!input) return null;
  const s = String(input).toLowerCase().trim();
  if (LANGS[s]) return s;
  if (NAME_TO_CODE[s]) return NAME_TO_CODE[s];
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   CLEAN OUTPUT
   ═══════════════════════════════════════════════════════════════════ */
function cleanText(s) {
  if (!s) return "";
  return String(s)
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 1: MyMemory
   ═══════════════════════════════════════════════════════════════════ */
async function tryMyMemory(text, target) {
  try {
    const r = await axios.get("https://api.mymemory.translated.net/get", {
      params: { q: text, langpair: `auto|${target}` },
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    let translated = r.data?.responseData?.translatedText;
    if (!translated) return null;
    if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(translated)) return null;
    translated = cleanText(translated);
    if (!translated) return null;

    console.log("[trans] ✅ MyMemory");
    return {
      text: translated,
      detected: r.data?.responseData?.detectedLanguage || null
    };
  } catch (e) {
    console.log("[trans] MyMemory err:", e.message);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 2: Google Translate (free gtx endpoint)
   ═══════════════════════════════════════════════════════════════════ */
async function tryGoogle(text, target) {
  try {
    const r = await axios.get(
      "https://translate.googleapis.com/translate_a/single",
      {
        params: { client: "gtx", sl: "auto", tl: target, dt: "t", q: text },
        timeout: 12000,
        headers: { "User-Agent": "Mozilla/5.0" }
      }
    );
    const arr = r.data?.[0] || [];
    const translated = cleanText(arr.map((seg) => seg?.[0] || "").join(""));
    if (!translated) return null;

    console.log("[trans] ✅ Google");
    return {
      text: translated,
      detected: r.data?.[2] || null
    };
  } catch (e) {
    console.log("[trans] Google err:", e.message);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 3: LibreTranslate (multiple public instances)
   ═══════════════════════════════════════════════════════════════════ */
const LIBRE_INSTANCES = [
  "https://libretranslate.com",
  "https://translate.argosopentech.com",
  "https://libretranslate.de",
  "https://translate.terraprint.co"
];

async function tryLibre(text, target) {
  for (const base of LIBRE_INSTANCES) {
    try {
      const r = await axios.post(
        `${base}/translate`,
        {
          q: text,
          source: "auto",
          target: target,
          format: "text"
        },
        {
          timeout: 12000,
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/json"
          }
        }
      );

      const translated = cleanText(r.data?.translatedText);
      if (!translated) continue;

      console.log(`[trans] ✅ LibreTranslate (${base})`);
      return {
        text: translated,
        detected: r.data?.detectedLanguage?.language || null
      };
    } catch (e) {
      console.log(`[trans] Libre ${base} err: ${e.message}`);
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 4: Lingva Translate (Google proxy)
   ═══════════════════════════════════════════════════════════════════ */
const LINGVA_INSTANCES = [
  "https://lingva.ml",
  "https://lingva.garudalinux.org",
  "https://translate.plausibility.cloud"
];

async function tryLingva(text, target) {
  for (const base of LINGVA_INSTANCES) {
    try {
      const r = await axios.get(
        `${base}/api/v1/auto/${target}/${encodeURIComponent(text)}`,
        { timeout: 12000, headers: { "User-Agent": "Mozilla/5.0" } }
      );

      const translated = cleanText(r.data?.translation);
      if (!translated) continue;

      console.log(`[trans] ✅ Lingva (${base})`);
      return {
        text: translated,
        detected: r.data?.info?.detectedSource || null
      };
    } catch (e) {
      console.log(`[trans] Lingva ${base} err: ${e.message}`);
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 5: Translated.net (free tier)
   ═══════════════════════════════════════════════════════════════════ */
async function tryTranslatedNet(text, target) {
  try {
    const r = await axios.get("https://api.translated.net/get", {
      params: {
        q: text,
        langpair: `autodetect|${target}`,
        key: "trnsl.1.1.20240101T000000Z.0000000000000000.0000000000000000"
      },
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const translated = cleanText(r.data?.responseData?.translatedText);
    if (!translated) return null;

    console.log("[trans] ✅ Translated.net");
    return { text: translated, detected: null };
  } catch (e) {
    console.log("[trans] Translated.net err:", e.message);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MASTER: try providers in order
   ═══════════════════════════════════════════════════════════════════ */
async function translateText(text, target) {
  const providers = [
    { name: "MyMemory",       fn: () => tryMyMemory(text, target) },
    { name: "Google",         fn: () => tryGoogle(text, target) },
    { name: "LibreTranslate", fn: () => tryLibre(text, target) },
    { name: "Lingva",         fn: () => tryLingva(text, target) },
    { name: "Translated.net", fn: () => tryTranslatedNet(text, target) }
  ];

  for (const p of providers) {
    try {
      const result = await p.fn();
      if (result && result.text) return result;
    } catch (e) {
      console.log(`[trans] ${p.name} threw: ${e.message}`);
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════════════ */
module.exports = {
  name: "trans",
  aliases: ["tr", "tr2", "translate"],
  version: "2.0.0",
  role: 0,
  description: "Auto-detect and translate text (multi-source)",
  usage: "/trans <text>  |  /trans <lang> <text>  |  reply + /trans",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, body, messageReply } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* Extract args from event.args or body */
    let argList = (args || []).slice();
    if (!argList.length && body) {
      const prefix = config.prefix || "/";
      let raw = body.trim();
      if (raw.startsWith(prefix)) raw = raw.slice(prefix.length).trim();
      raw = raw.replace(/^(trans|tr2|tr|translate)\s+/i, "").trim();
      argList = raw ? raw.split(/\s+/) : [];
    }

    let target = "en";
    let text = argList.join(" ").trim();

    /* ═══ Reply-based translation ═══ */
    if (!text && messageReply && messageReply.body) {
      text = String(messageReply.body).trim();
    }

    /* ═══ Check if first arg is a language code/name ═══ */
    if (argList.length && text) {
      const maybe = resolveLang(argList[0]);
      if (maybe) {
        target = maybe;
        text = argList.slice(1).join(" ").trim();
        /* If reply present and no text after lang, use reply body */
        if (!text && messageReply && messageReply.body) {
          text = String(messageReply.body).trim();
        }
      }
    }

    if (!text) {
      react("❓");
      return api.sendMessage(
        `🌐 TRANSLATOR\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📌 Usage:\n` +
        `• /trans <text>           → English\n` +
        `• /trans <lang> <text>    → specific language\n` +
        `• Reply + /trans          → translate reply\n` +
        `• Reply + /trans bn       → reply to Bengali\n\n` +
        `📝 Examples:\n` +
        `/trans Hello world\n` +
        `/trans bn How are you?\n` +
        `/trans japanese Good morning`,
        threadID
      );
    }

    /* Length guard */
    if (text.length > 4000) text = text.slice(0, 4000);

    react("⏳");
    console.log(`[trans] target=${target} len=${text.length}`);

    try {
      const result = await translateText(text, target);
      if (!result || !result.text) {
        throw new Error("all translation services failed — try again");
      }

      let translated = result.text;
      if (translated.length > 1500) translated = translated.slice(0, 1497) + "...";

      const targetName = LANGS[target] || target.toUpperCase();
      let detectedName = "";
      if (result.detected && result.detected !== target && LANGS[result.detected]) {
        detectedName = LANGS[result.detected];
      }

      react("✅");

      let reply;
      if (detectedName) {
        reply = `🌐 ${detectedName} → ${targetName}\n━━━━━━━━━━━━━━━━━━\n${translated}`;
      } else {
        reply = `🌐 → ${targetName}\n━━━━━━━━━━━━━━━━━━\n${translated}`;
      }

      return api.sendMessage(reply, threadID);

    } catch (e) {
      console.error("[trans] error:", e.message);

      let errLine = e.message;
      if (e.message.includes("timeout")) errLine = "network timeout — try again";
      else if (e.message.includes("all translation")) errLine = "all translation APIs failed — try again";
      else if (e.message.includes("ENOTFOUND")) errLine = "network unreachable";
      else errLine = e.message.slice(0, 100);

      react("❌");
      api.sendMessage(`❌ ${errLine}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1