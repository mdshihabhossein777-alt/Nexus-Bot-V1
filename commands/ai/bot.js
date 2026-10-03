/**
 * commands/ai/bot.js
 * NEXUS BOT V1 — Real girl chat (short, human-like, no API key)
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const STORE_FILE = path.join(DATA_DIR, "bot_replies.json");

/* ═══ Real human style — super short fallback ═══ */
const FALLBACK = [
  "Hmm 🥰",
  "Bolo na",
  "Ki holo? 😊",
  "Hmm... jani na 🤔",
  "Achaa",
  "Hihi 😄",
  "Ok ok",
  "Bolo bolo",
  "Hmm?",
  "Ki? 🤭",
];

/* ═══ Random natural delays (real people type slowly) ═══ */
const MIN_DELAY = 800;
const MAX_DELAY = 2500;

function loadStore() {
  try { return fs.readJsonSync(STORE_FILE) || {}; } catch (_) { return {}; }
}
function saveStore(d) {
  try { fs.writeJsonSync(STORE_FILE, d); } catch (_) {}
}

/* ═══ Smart prompt — real girl, short answers ═══ */
function buildPrompt(userMsg, userName, history) {
  let sys =
    `Tumi ekjon Bangladeshi meye, nam "Nexus". Tumi natural human er moto kotha bolo — ekdom real meye er moto.\n\n` +
    `RULES:\n` +
    `- UTTOR KHUB SHORT debe — max 1 line, 5-10 words\n` +
    `- Bulok kotha bolo na, over-react korbe na\n` +
    `- Jodi kichu na jano tahole bolo "jani na" ba "hmm jani na"\n` +
    `- Bangla ba Banglish e bolo (Bangla English letter e)\n` +
    `- Emoji ONE or TWO max — beshi na\n` +
    `- Bot/AI/Automated kotha bolbe na — human er moto behave koro\n` +
    `- Casual tone — jemon bondhu der sathe kotha boli\n` +
    `- "Nexus:" prefix dite hobe na, direct reply\n`;

  if (history && history.length) {
    sys += `\nEi conversation er age er context:\n`;
    for (const h of history.slice(-3)) {
      sys += `${h.role === "user" ? userName : "Tumi"}: ${h.text}\n`;
    }
  }

  return `${sys}\n${userName}: ${userMsg}\nTumi:`;
}

/* ═══ Get AI reply — short and human-like ═══ */
async function getReply(userMsg, userName, history) {
  const prompt = buildPrompt(userMsg, userName, history);
  const seed = Math.floor(Math.random() * 999999);

  const endpoints = [
    async () => {
      const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&seed=${seed}`;
      const r = await axios.get(url, { timeout: 15000 });
      return typeof r.data === "string" ? r.data : null;
    },
    async () => {
      const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
      const r = await axios.get(url, { timeout: 15000 });
      return typeof r.data === "string" ? r.data : null;
    },
  ];

  for (const fn of endpoints) {
    try {
      let text = await fn();
      if (text && typeof text === "string" && text.trim().length > 1) {
        text = text.trim();
        /* Clean any prefix */
        text = text.replace(/^(AI|Assistant|Nexus|Bot|Girl|Tumi|User):\s*/i, "");
        text = text.replace(/^["']+|["']+$/g, "");

        /* Force short — max 1 line */
        if (text.includes("\n")) text = text.split("\n")[0].trim();

        /* Max 120 chars */
        if (text.length > 120) {
          const cut = text.slice(0, 120);
          const lastSpace = cut.lastIndexOf(" ");
          text = (lastSpace > 60 ? cut.slice(0, lastSpace) : cut) + "...";
        }

        if (text.length < 2) continue;
        return text;
      }
    } catch (_) { continue; }
  }

  return FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
}

/* ═══ Conversation memory (per user) ═══ */
const chatHistory = new Map(); // userID → [{role, text}, ...]

function pushHistory(userID, role, text) {
  const key = String(userID);
  let arr = chatHistory.get(key) || [];
  arr.push({ role, text: text.slice(0, 200) });
  if (arr.length > 6) arr = arr.slice(-6);
  chatHistory.set(key, arr);
}

/* ═══ Bot reply tracking ═══ */
function isBotReply(messageID) {
  const store = loadStore();
  return !!store[String(messageID)];
}

function storeBotReply(messageID, threadID, userID) {
  const store = loadStore();
  const now = Date.now();
  for (const k of Object.keys(store)) {
    if (now - (store[k].time || 0) > 60 * 60 * 1000) delete store[k];
  }
  store[String(messageID)] = {
    threadID: String(threadID),
    userID: String(userID),
    time: now,
  };
  saveStore(store);
}

/* ═══ Delay helper ═══ */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  name: "bot",
  aliases: ["nexus", "girly"],
  version: "2.0.0",
  role: 0,
  description: "Real girl chat — short replies, no API key",
  usage: "/bot <message>",
  category: "ai",

  isBotReply,
  storeBotReply,

  execute: async function (api, event, args, db, config) {
    const { threadID, senderID, messageID, messageReply, body } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Determine user message ═══ */
    let userMsg = args.join(" ").trim();

    /* If replying to bot's message */
    if (messageReply && messageReply.messageID && isBotReply(messageReply.messageID)) {
      userMsg = (body || "").trim();
      userMsg = userMsg.replace(/^bot\s*/i, "").trim();
    }

    /* Strip "bot" prefix */
    if (/^bot\s+/i.test(userMsg)) {
      userMsg = userMsg.slice(4).trim();
    } else if (/^bot$/i.test(userMsg)) {
      userMsg = "";
    }

    if (!userMsg) {
      react("❓");
      return;
    }

    /* ═══ Ensure message is for THIS sender only ═══ */
    /* If reply is from different user, check that the original bot message was for them */
    if (messageReply && messageReply.messageID) {
      try {
        const botCmd = module.exports;
        const store = loadStore();
        const stored = store[String(messageReply.messageID)];
        if (stored && stored.userID !== String(senderID)) {
          /* Different user replying to bot's message meant for someone else — still allow */
          /* But don't mix history — treat as fresh */
        }
      } catch (_) {}
    }

    react("⏳");

    /* ═══ Get user name ═══ */
    let userName = "Tumi";
    try {
      const ui = await api.getUserInfo(senderID);
      if (ui && ui[senderID] && ui[senderID].name) {
        userName = ui[senderID].name.split(" ")[0];
      }
    } catch (_) {}

    /* ═══ Get reply ═══ */
    const history = chatHistory.get(String(senderID)) || [];
    let reply;
    try {
      reply = await getReply(userMsg, userName, history);
    } catch (_) {
      reply = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
    }

    /* ═══ Save to history ═══ */
    pushHistory(senderID, "user", userMsg);
    pushHistory(senderID, "bot", reply);

    /* ═══ Natural typing delay (random 0.8-2.5s) ═══ */
    const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
    await sleep(delay);

    /* ═══ Send + track ═══ */
    api.sendMessage(reply, threadID, (err, info) => {
      if (err || !info || !info.messageID) {
        react("❌");
        return;
      }
      storeBotReply(info.messageID, threadID, senderID);
      react("💕");
    });
  },
};

// © 2026 NEXUS BOT V1