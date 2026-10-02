const axios = require("axios");

module.exports = {
  name: "upscale",
  aliases: ["hd"],
  version: "1.0.0",
  role: 0,
  description: "Upscale resolution (higher detail generation)",
  usage: "/upscale <prompt>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const prompt = args.join(" ").trim();
      if (!prompt) return api.sendMessage("🔍 Usage: /upscale <prompt>", threadID);

      api.sendMessage("🔍 Generating HD...", threadID);

      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=1536&height=1536&nologo=true`;
      const r = await axios.get(url, { responseType: "arraybuffer", timeout: 90000 });
      api.sendMessage({ body: `🔍 HD: ${prompt}`, attachment: Buffer.from(r.data) }, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app