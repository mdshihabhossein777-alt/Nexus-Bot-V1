const axios = require("axios");

module.exports = {
  name: "meme", aliases: ["memes"], version: "1.0.0", role: 0,
  description: "Get a random meme from Reddit",
  usage: "/meme",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      api.sendMessage("😂 Finding a meme...", threadID);
      const r = await axios.get("https://meme-api.com/gimme", { timeout: 15000 });
      const d = r.data;
      if (!d || !d.url) throw new Error("No meme available.");
      const img = await axios.get(d.url, { responseType: "arraybuffer", timeout: 20000 });
      api.sendMessage({
        body: `😂 ${d.title}\n👍 ${d.ups} | r/${d.subreddit}`,
        attachment: Buffer.from(img.data)
      }, threadID);
    } catch (e) { api.sendMessage("❌ Meme failed: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app