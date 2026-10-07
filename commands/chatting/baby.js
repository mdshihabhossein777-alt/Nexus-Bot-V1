/**
 * commands/ai/baby.js
 * NEXUS BOT V1 — Cute Chat (baby/bot triggers + reply support)
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

/* ═══ Trigger words ═══ */
const TRIGGERS = ["baby", "bby", "bot", "jan", "mia", "babu", "janu"];

/* ═══ Bot message tracker (for reply detection) ═══ */
const DATA_DIR = path.join(__dirname, "..", "..", "data");
fs.ensureDirSync(DATA_DIR);
const BOT_MSG_FILE = path.join(DATA_DIR, "baby_replies.json");

function loadBotMsgs() {
  try { return fs.readJsonSync(BOT_MSG_FILE) || {}; } catch (_) { return {}; }
}
function saveBotMsgs(d) {
  try { fs.writeJsonSync(BOT_MSG_FILE, d); } catch (_) {}
}

function storeBotMsg(messageID, threadID, userID) {
  const data = loadBotMsgs();
  const now = Date.now();

  /* Cleanup old (> 1 hour) */
  for (const k of Object.keys(data)) {
    if (now - (data[k].time || 0) > 60 * 60 * 1000) delete data[k];
  }

  data[String(messageID)] = {
    threadID: String(threadID),
    userID: String(userID),
    time: now
  };
  saveBotMsgs(data);
}

function isBotMsg(messageID) {
  const data = loadBotMsgs();
  return !!data[String(messageID)];
}

/* ═══ Short cute fallbacks ═══ */
const FALLBACK = [
  "Hmm 🥰",
  "Bolo na 😊",
  "Ki holo?",
  "Hmm? 🤭",
  "Bolo bolo",
  "Ji bolo?",
  "Ami achi 🥺",
  "Hihi 😄",
  "Ki? 🥰",
  "Bolo jan 💕"
];

/* ═══ AI reply (Pollinations) ═══ */
async function getAIReply(userMsg, userName) {
  const sys =
    `You are a cute Bangladeshi girl named "Mia". ` +
    `Reply in Bangla/Banglish (short 1 line max, 5-10 words). ` +
    `Cute tone, playful, use 1 emoji max. ` +
    `Never say you are AI/bot. ` +
    `Reply direct, no prefix.`;

  const prompt = `${sys}\n\n${userName}: ${userMsg}\nMia:`;

  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&seed=${Date.now()}`;
    const r = await axios.get(url, {
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (r.data && typeof r.data === "string") {
      let reply = r.data.trim();
      reply = reply.replace(/^["']|["']$/g, "");
      reply = reply.replace(/^(Mia|AI|Assistant|Girl|Nexus):\s*/i, "");

      /* Force short */
      if (reply.includes("\n")) reply = reply.split("\n")[0].trim();
      if (reply.length > 100) {
        const cut = reply.slice(0, 100);
        const lastSpace = cut.lastIndexOf(" ");
        reply = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + "...";
      }

      if (reply.length > 2) return reply;
    }
  } catch (e) {
    console.log("[baby] ai fail:", e.message.slice(0, 40));
  }

  return FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
}

/* ═══ Random typing delay (human-like) ═══ */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ═══════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════ */
module.exports = {
  name: "baby",
  aliases: ["bby", "mia", "jan", "babu", "bot"],
  version: "3.0.0",
  role: 0,
  description: "Cute baby chat — no prefix",
  usage: "baby <text>  OR  bot <text>  OR  reply to bot",
  category: "ai",

  /* ═══ Trigger words ═══ */
  triggers: {
    text: TRIGGERS
  },

  /* ═══ For reply detection ═══ */
  isBotReply: isBotMsg,
  storeBotReply: storeBotMsg,

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, body, messageReply } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Parse user text ═══ */
    let userText = "";
    let isReplyTrigger = false;

    /* ═══ Case 1: Reply to bot's message ═══ */
    if (messageReply && messageReply.messageID && isBotMsg(messageReply.messageID)) {
      isReplyTrigger = true;
      userText = (body || "").trim();

      /* Strip trigger word if present */
      const firstWord = userText.split(/\s+/)[0].toLowerCase();
      if (TRIGGERS.includes(firstWord)) {
        userText = userText.slice(firstWord.length).trim();
      }
    }

    /* ═══ Case 2: Trigger word at start ═══ */
    if (!isReplyTrigger) {
      const lower = (body || "").trim().toLowerCase();

      /* Find which trigger matched */
      let matched = null;
      for (const t of TRIGGERS) {
        if (lower === t || lower.startsWith(t + " ")) {
          matched = t;
          break;
        }
      }

      if (!matched) {
        /* Not a trigger — check args */
        userText = args.join(" ").trim();
      } else {
        userText = (body || "").slice(matched.length).trim();
      }
    }

    /* ═══ Empty text → cute greeting ═══ */
    if (!userText) {
      const greetings = [
        "Hmm? 🥰",
        "Bolo na 😊",
        "Ki holo? 🤭",
        "Yes bolo 💕",
        "Ami achi 🥺",
        "Ji bolo?",
        "Hmm? ✨",
        "Bolo ki bolbe"
      ];
      react("💕");
      const delay = 600 + Math.random() * 800;
      await sleep(delay);

      return api.sendMessage(
        greetings[Math.floor(Math.random() * greetings.length)],
        threadID,
        (err, info) => {
          if (!err && info && info.messageID) {
            storeBotMsg(info.messageID, threadID, senderID);
          }
        }
      );
    }

    if (userText.length > 300) userText = userText.slice(0, 300);

    react("💬");

    /* ═══ Get user name ═══ */
    let userName = "User";
    try {
      const ui = await api.getUserInfo(senderID);
      if (ui && ui[senderID] && ui[senderID].name) {
        userName = ui[senderID].name.split(" ")[0];
      }
    } catch (_) {}

    /* ═══ Generate reply ═══ */
    let reply;
    try {
      reply = await getAIReply(userText, userName);
    } catch (_) {
      reply = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
    }

    /* ═══ Natural delay (0.8-2s) ═══ */
    const delay = 800 + Math.random() * 1200;
    await sleep(delay);

    /* ═══ Send + store messageID ═══ */
    api.sendMessage(reply, threadID, (err, info) => {
      if (err || !info || !info.messageID) {
        react("❌");
        return;
      }
      storeBotMsg(info.messageID, threadID, senderID);
      react("😚");
    });
  }
};

// © 2026 NEXUS BOT V1