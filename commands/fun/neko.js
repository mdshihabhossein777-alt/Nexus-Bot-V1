const axios = require("axios");

module.exports = {
  name: "neko",
  aliases: ["catgirl"],
  version: "1.1.0",
  role: 0,
  description: "Get a random neko image (SFW)",
  usage: "/neko",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      // নির্ভরযোগ্য Nekos.best API ব্যবহার করছি
      const r = await axios.get("https://nekos.best/api/v2/neko", { timeout: 15000 });
      
      // নতুন API থেকে ইমেজ URL নেওয়ার নিয়ম
      const url = r.data?.results?.[0]?.url;
      
      if (!url) {
        return api.sendMessage("❌ No neko found.", threadID);
      }

      const img = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });

      api.sendMessage(
        { body: "🐱 Nyaa~ Here's a neko!", attachment: Buffer.from(img.data) },
        threadID
      );
    } catch (e) {
      api.sendMessage("❌ Neko failed: " + e.message, threadID);
    }
  }
};
