const axios = require("axios");

module.exports = {
  name: "toanime",
  aliases: ["animefy"],
  version: "1.0.0",
  role: 0,
  description: "Convert a prompt into anime-style art",
  usage: "/toanime <prompt>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const prompt = args.join(" ").trim();
      if (!prompt) return api.sendMessage("🎌 Usage: /toanime <prompt>", threadID);

      api.sendMessage("🎌 Anime style rendering...", threadID);

      const fullPrompt = `anime style, studio ghibli, ${prompt}`;
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?model=flux&width=1024&height=1024&nologo=true`;
      const r = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
      api.sendMessage({ body: `🎌 ${prompt}`, attachment: Buffer.from(r.data) }, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app