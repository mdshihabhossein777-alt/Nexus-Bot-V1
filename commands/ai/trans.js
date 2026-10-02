const axios = require("axios");

module.exports = {
  name: "trans",
  aliases: ["tr2"],
  version: "1.0.0",
  role: 0,
  description: "Auto-detect language and translate (to English)",
  usage: "/trans <text>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const text = args.join(" ").trim();
      if (!text) return api.sendMessage("📝 Usage: /trans <text>", threadID);

      const r = await axios.get("https://api.mymemory.translated.net/get", {
        params: { q: text, langpair: `auto|en` },
        timeout: 20000
      });

      const result = r.data?.responseData?.translatedText;
      if (!result) throw new Error("No translation returned.");

      api.sendMessage(`🌐 ${result}`, threadID);
    } catch (e) { api.sendMessage("❌ Failed: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app