// Nexus Bot V1 - Free Baby Chat
// Author: Ariyan Shihab
// No Key - Free API - React Only System

const axios = require("axios");
const TRIGGERS = ["baby", "bby", "bot", "jan", "mia"];

const getReply = async (text) => {
  try {
    // FREE API 1 - Pollinations AI (No key)
    const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai`, { timeout: 8000 });
    if (res.data && typeof res.data === "string") return res.data.slice(0, 500);
  } catch {}

  try {
    // FREE API 2 - Backup - SimSum API
    const res2 = await axios.get(`https://api.simsimi.vn/v1/simtalk`, {
      params: { text: text, lang: "bn" },
      timeout: 5000
    });
    if (res2.data?.message) return res2.data.message;
  } catch {}

  return "Mia bolo jan 🥺, ektu pore try koro!";
};

module.exports = {
  config: {
    name: "bby2",
    aliases: ["baby2", "mia", "jan2"],
    version: "2.0",
    author: "Ariyan Shihab",
    countDown: 3,
    role: 0,
    shortDescription: "Free Baby Chat - No API Key",
    longDescription: "Free chat like baby cmd",
    category: "chatting",
    guide: "{pn} [msg] - chat\nbby2 teach is not needed, auto ai"
  },

  onStart: async function ({ api, event, args, message }) {
    const text = args.join(" ").trim();
    if (!text) {
      api.setMessageReaction("😚", event.messageID, () => {}, true);
      return api.sendMessage("Bolo jan ki korte pari tomar jonno? 🐥", event.threadID, event.messageID);
    }
    api.setMessageReaction("⏳", event.messageID, () => {}, true);
    try {
      const reply = await getReply(text);
      api.setMessageReaction("✅", event.messageID, () => {}, true);
      return message.reply(reply);
    } catch {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("❌ API Error - pore try koro");
    }
  },

  onChat: async function ({ api, event }) {
    const body = String(event.body || "").trim();
    if (!body) return;
    const lower = body.toLowerCase();
    const trigger = TRIGGERS.find(t => lower === t || lower.startsWith(t + " "));
    if (!trigger) return;

    const text = body.slice(trigger.length).trim();
    if (!text) {
      const random = ["😚", "🫣", "Yes Mia here 😍", "Bolo jan 🐥", "Ki hoise?"];
      return api.sendMessage(random[Math.floor(Math.random() * random.length)], event.threadID, event.messageID);
    }

    api.setMessageReaction("💬", event.messageID, () => {}, true);
    try {
      const reply = await getReply(text);
      return api.sendMessage(reply, event.threadID, event.messageID);
    } catch {}
  }
};
