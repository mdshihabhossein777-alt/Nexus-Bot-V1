const axios = require("axios");

module.exports = {
  name: "ai",
  aliases: ["askai", "chatbot"],
  version: "1.0.0",
  role: 0,
  description: "Chat with NEXUS AI (powered by pollinations.ai)",
  usage: "/ai <your question>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const prompt = args.join(" ").trim();
      if (!prompt) return api.sendMessage("📝 Usage: /ai <question>", threadID);

      api.sendMessage("🤔 Thinking...", threadID);

      const r = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(prompt)}`,
        { params: { model: "openai" }, timeout: 60000 }
      );

      const answer = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
      api.sendMessage(`🤖 ${answer.slice(0, 1900)}`, threadID);
    } catch (e) {
      api.sendMessage("❌ AI failed: " + e.message, threadID);
    }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app