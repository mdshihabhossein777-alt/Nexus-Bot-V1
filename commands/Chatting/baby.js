/**
 * commands/ai/baby.js
 * NEXUS BOT V1 — Free Baby Chat (no API key)
 * © 2026
 */

const axios = require("axios");

/* ═══ Trigger words ═══ */
const TRIGGERS = ["baby", "bby", "jan", "mia", "babu", "janu"];

/* ═══ Free AI reply ═══ */
async function getReply(text) {
  /* Provider 1 — Pollinations AI */
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai&seed=${Date.now()}`;
    const r = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (r.data && typeof r.data === "string") {
      let reply = r.data.trim();
      reply = reply.replace(/^["']|["']$/g, "");
      if (reply.length > 300) reply = reply.slice(0, 297) + "...";
      if (reply.length > 2) return reply;
    }
  } catch (e) {
    console.log("[baby] pollinations fail:", e.message.slice(0, 40));
  }

  /* Provider 2 — Pollinations with prompt */
  try {
    const prompt = `You are a cute, playful girlfriend named "Mia". Reply in Bangla/Banglish (short 1-2 sentences, cute tone). User: ${text}\nMia:`;
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
    const r = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (r.data && typeof r.data === "string") {
      let reply = r.data.trim();
      reply = reply.replace(/^["']|["']$/g, "");
      reply = reply.replace(/^(Mia|AI|Assistant|Girl):\s*/i, "");
      if (reply.length > 300) reply = reply.slice(0, 297) + "...";
      if (reply.length > 2) return reply;
    }
  } catch (_) {}

  /* Fallback */
  const fb = [
    "Bolo jan 🥺",
    "Hmm ki holo? 😚",
    "Ami sunchi bolo 💕",
    "Ki korte pari tomar jonno? 🐥",
    "Hehe moja lagche 😍"
  ];
  return fb[Math.floor(Math.random() * fb.length)];
}

module.exports = {
  name: "baby",
  aliases: ["bby", "mia", "jan", "babu"],
  version: "2.0.0",
  role: 0,
  description: "Free baby chat (no API key)",
  usage: "baby <text>",
  category: "ai",

  /* ═══ Text triggers — no prefix needed ═══ */
  triggers: {
    text: TRIGGERS
  },

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, body } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Extract text after trigger ═══ */
    let rawText = (body || "").trim().toLowerCase();

    /* Find which trigger matched */
    let matchedTrigger = null;
    for (const t of TRIGGERS) {
      if (rawText === t || rawText.startsWith(t + " ")) {
        matchedTrigger = t;
        break;
      }
    }

    let userText = "";
    if (matchedTrigger) {
      userText = (body || "").slice(matchedTrigger.length).trim();
    } else {
      userText = args.join(" ").trim();
    }

    /* ═══ Empty trigger — cute greeting ═══ */
    if (!userText) {
      const greetings = [
        "😚",
        "🫣",
        "Yes Mia here 😍",
        "Bolo jan 🐥",
        "Ki hoise?",
        "Hmm bolo? 💕",
        "Ami achi 🥰"
      ];
      react("💕");
      return api.sendMessage(
        greetings[Math.floor(Math.random() * greetings.length)],
        threadID
      );
    }

    if (userText.length > 300) userText = userText.slice(0, 300);

    react("💬");

    try {
      const reply = await getReply(userText);
      react("😚");
      return api.sendMessage(reply, threadID);
    } catch (e) {
      console.log("[baby] error:", e.message);
      react("❌");
      return api.sendMessage("🥺 Ektu pore try koro jan", threadID);
    }
  }
};

// © 2026 NEXUS BOT V1