const axios = require("axios");

module.exports = {
  name: "gpt",
  aliases: ["chatgpt"],
  version: "1.0.0",
  role: 0,
  description: "Chat with GPT via pollinations.ai",
  usage: "/gpt <your question>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const prompt = args.join(" ").trim();
      if (!prompt) return api.sendMessage("📝 Usage: /gpt <question>", threadID);

      api.sendMessage("💭 Asking GPT...", threadID);

      const r = await axios.post(
        "https://gen.pollinations.ai/v1/chat/completions",
        {
          model: "openai",
          messages: [
            { role: "system", content: "You are NEXUS, a helpful Messenger bot assistant. Keep answers concise (max 500 words)." },
            { role: "user", content: prompt }
          ]
        },
        { timeout: 60000, headers: { "Content-Type": "application/json" } }
      );

      const msg = r.data?.choices?.[0]?.message?.content || "No response.";
      api.sendMessage(`🤖 ${msg.slice(0, 1900)}`, threadID);
    } catch (e) {
      api.sendMessage("❌ GPT failed: " + e.message, threadID);
    }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app