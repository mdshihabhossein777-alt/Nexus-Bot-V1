const axios = require("axios");

module.exports = {
  name: "tts",
  aliases: ["speak", "voice"],
  version: "1.0.0",
  role: 0,
  description: "Text-to-speech via pollinations (voice: nova)",
  usage: "/tts <text>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const text = args.join(" ").trim();
      if (!text) return api.sendMessage("🔊 Usage: /tts <text>", threadID);

      api.sendMessage("🔊 Generating speech...", threadID);

      const url = `https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai-audio&voice=nova`;
      const r = await axios.get(url, { responseType: "arraybuffer", timeout: 60000 });

      // Attachment buffer sent as audio
      api.sendMessage({
        body: `🔊 "${text.slice(0, 80)}${text.length > 80 ? "..." : ""}"`,
        attachment: Buffer.from(r.data)
      }, threadID);
    } catch (e) { api.sendMessage("❌ TTS failed: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app