const axios = require("axios");

module.exports = {
  name: "chat",
  aliases: ["talk"],
  version: "1.0.0",
  role: 0,
  description: "Simple chat with AI",
  usage: "/chat <message>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const prompt = args.join(" ").trim();
      if (!prompt) return api.sendMessage("📝 Usage: /chat <message>", threadID);

      const r = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(prompt)}`,
        { params: { model: "openai" }, timeout: 60000 }
      );

      const answer = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
      api.sendMessage(answer.slice(0, 1900), threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app