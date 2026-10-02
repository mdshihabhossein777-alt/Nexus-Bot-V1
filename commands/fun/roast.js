const axios = require("axios");
module.exports = {
  name: "roast", aliases: ["insult"], version: "1.0.0", role: 0,
  description: "Playfully roast a mentioned user", usage: "/roast @user",
  execute: async function (api, event, args, db) {
    const { threadID, mentions, messageReply } = event;
    try {
      let target = null, name = "you";
      const ids = Object.keys(mentions || {});
      if (ids.length) { target = String(ids[0]); name = mentions[target] || target; }
      else if (messageReply && messageReply.senderID) {
        target = String(messageReply.senderID);
        try { const i = await api.getUserInfo(target); if (i[target]) name = i[target].name; } catch (e) {}
      }
      if (!target) return api.sendMessage("📝 Reply or mention someone to roast.", threadID);
      if (target === String(api.getCurrentUserID())) return api.sendMessage("🙃 Can't roast myself.", threadID);

      const prompt = `Write a short playful roast (max 25 words, friendly, no slurs, no harassment) for someone named "${name}". Return ONLY the roast.`;
      const r = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, { params: { model: "openai" }, timeout: 30000 });
      const txt = typeof r.data === "string" ? r.data : "You're so cool, you make ice jealous.";
      api.sendMessage(`🔥 ${txt.slice(0, 400)}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app