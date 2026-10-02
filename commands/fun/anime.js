const axios = require("axios");
module.exports = {
  name: "anime", aliases: ["animepic"], version: "1.0.0", role: 0,
  description: "Get a random anime picture (SFW)", usage: "/anime",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const cats = ["waifu", "neko", "shinobu", "megumin", "awoo", "cuddle", "hug", "smile", "wave"];
      const c = cats[Math.floor(Math.random() * cats.length)];
      const r = await axios.get(`https://api.waifu.pics/sfw/${c}`, { timeout: 15000 });
      const url = r.data?.url;
      const img = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
      api.sendMessage({ body: `🌸 ${c}`, attachment: Buffer.from(img.data) }, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app