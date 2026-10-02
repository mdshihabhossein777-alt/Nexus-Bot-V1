const axios = require("axios");

module.exports = {
  name: "prompt",
  aliases: ["enhance-prompt"],
  version: "1.0.0",
  role: 0,
  description: "Enhance your image prompt for better results",
  usage: "/prompt <short idea>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const text = args.join(" ").trim();
      if (!text) return api.sendMessage("📝 Usage: /prompt <short idea>", threadID);

      const fullPrompt = `Expand this image prompt into a detailed, vivid description (max 40 words). Return ONLY the enhanced prompt:\n\n"${text}"`;

      const r = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}`,
        { params: { model: "openai" }, timeout: 60000 }
      );

      const enhanced = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
      api.sendMessage(`✨ Enhanced prompt:\n\n${enhanced.slice(0, 800)}\n\n💡 Try: /imagine ${enhanced.slice(0, 200)}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app