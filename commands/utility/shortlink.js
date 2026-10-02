const axios = require("axios");
module.exports = {
  name: "shortlink", aliases: ["shorten", "tiny"], version: "1.0.0", role: 0,
  description: "Shorten a URL (is.gd free API)", usage: "/shortlink <url>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const url = args[0];
      if (!url || !/^https?:\/\//i.test(url)) return api.sendMessage("🔗 Usage: /shortlink <url>", threadID);
      const r = await axios.get("https://is.gd/create.php", {
        params: { format: "json", url },
        timeout: 10000
      });
      if (r.data?.shorturl) {
        return api.sendMessage(`🔗 Short URL:\n${r.data.shorturl}`, threadID);
      }
      throw new Error(r.data?.errormessage || "Failed to shorten.");
    } catch (e) { api.sendMessage("❌ Shorten failed: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app