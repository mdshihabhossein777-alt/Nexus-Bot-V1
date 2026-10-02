const axios = require("axios");
module.exports = {
  name: "quote", aliases: ["quotes"], version: "1.0.0", role: 0,
  description: "Random inspirational quote", usage: "/quote",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const r = await axios.get("https://zenquotes.io/api/random", { timeout: 10000 }).catch(() => null);
      if (r && Array.isArray(r.data) && r.data[0]) {
        return api.sendMessage(`💭 "${r.data[0].q}"\n\n— ${r.data[0].a}`, threadID);
      }
      const fallback = [
        { q: "The only way to do great work is to love what you do.", a: "Steve Jobs" },
        { q: "Life is what happens when you're busy making other plans.", a: "John Lennon" },
        { q: "In the middle of difficulty lies opportunity.", a: "Albert Einstein" },
        { q: "Believe you can and you're halfway there.", a: "Theodore Roosevelt" }
      ];
      const f = fallback[Math.floor(Math.random() * fallback.length)];
      api.sendMessage(`💭 "${f.q}"\n\n— ${f.a}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app