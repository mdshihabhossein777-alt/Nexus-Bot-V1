const axios = require("axios");

module.exports = {
  name: "ask",
  aliases: ["q"],
  version: "1.0.0",
  role: 0,
  description: "Ask AI a question",
  usage: "/ask <question>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const prompt = args.join(" ").trim();
      if (!prompt) return api.sendMessage("❓ Usage: /ask <question>", threadID);

      api.sendMessage("🤔 Thinking...", threadID);

      const r = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(prompt)}`,
        { params: { model: "openai" }, timeout: 60000 }
      );

      const answer = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
      api.sendMessage(`❓ ${prompt}\n\n💡 ${answer.slice(0, 1800)}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app