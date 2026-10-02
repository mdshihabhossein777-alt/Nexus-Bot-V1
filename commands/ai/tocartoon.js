const axios = require("axios");

module.exports = {
  name: "tocartoon",
  aliases: ["cartoonify"],
  version: "1.0.0",
  role: 0,
  description: "Convert a prompt into cartoon-style art",
  usage: "/tocartoon <prompt>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const prompt = args.join(" ").trim();
      if (!prompt) return api.sendMessage("🎨 Usage: /tocartoon <prompt>", threadID);

      api.sendMessage("🎨 Cartoon rendering...", threadID);

      const fullPrompt = `cartoon style, pixar, disney, 3d render, ${prompt}`;
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?model=flux&width=1024&height=1024&nologo=true`;
      const r = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });
      api.sendMessage({ body: `🎨 ${prompt}`, attachment: Buffer.from(r.data) }, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app