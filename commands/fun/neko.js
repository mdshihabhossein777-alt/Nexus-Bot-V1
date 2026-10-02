const axios = require("axios");
module.exports = {
  name: "neko", aliases: ["catgirl"], version: "1.0.0", role: 0,
  description: "Get a random neko image (SFW)", usage: "/neko",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const r = await axios.get("https://api.waifu.pics/sfw/neko", { timeout: 15000 });
      const url = r.data?.url;
      if (!url) throw new Error("No neko found.");
      const img = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
      api.sendMessage({ body: "🐱 Nyaa~ Here's a neko!", attachment: Buffer.from(img.data) }, threadID);
    } catch (e) { api.sendMessage("❌ Neko failed: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app