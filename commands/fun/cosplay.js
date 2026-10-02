const axios = require("axios");
module.exports = {
  name: "cosplay", aliases: ["animegirl"], version: "1.0.0", role: 0,
  description: "Get a random cosplay-style anime pic (SFW)", usage: "/cosplay",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const cats = ["waifu", "maid", "marin-kitagawa", "mori-calliope", "kakashi"];
      const c = cats[Math.floor(Math.random() * cats.length)];
      const r = await axios.get(`https://api.waifu.im/search`, { params: { included_tags: "waifu", is_nsfw: "false" }, timeout: 15000 });
      const url = r.data?.images?.[0]?.url;
      if (!url) throw new Error("No image found.");
      const img = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
      api.sendMessage({ body: "🎎 Cosplay vibes!", attachment: Buffer.from(img.data) }, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app