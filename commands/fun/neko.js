const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

module.exports = {
  name: "neko",
  aliases: ["catgirl"],
  version: "2.0.0",
  role: 0,
  description: "Get a random neko image (SFW)",
  usage: "/neko",
  execute: async function (api, event, args, db) {
    const { threadID } = event;

    if (event.messageID) {
      try { api.setMessageReaction("⏳", event.messageID, threadID, () => {}); } catch (_) {}
    }

    try {
      /* ⚡ Nekosia API — 2026 সালের নতুন ও নির্ভরযোগ্য API */
      const r = await axios.get("https://api.nekosia.cat/api/v1/images/catgirl", {
        timeout: 15000,
        headers: {
          "User-Agent": "NEXUS-BOT-V1/2.0 (https://github.com/mdshihabhossein777-alt/Nexus-Bot-V1)"
        }
      });

      /* Nekosia API থেকে ইমেজ URL নেওয়ার সঠিক নিয়ম */
      const imgUrl = r.data?.image?.url || r.data?.url;
      
      if (!imgUrl) {
        throw new Error("No neko image URL found in API response.");
      }

      const img = await axios.get(imgUrl, {
        responseType: "arraybuffer",
        timeout: 20000,
        headers: { "User-Agent": "Mozilla/5.0" },
        maxContentLength: 15 * 1024 * 1024
      });

      const buf = Buffer.from(img.data);

      /* ইমেজের আসল ফরম্যাট ডিটেক্ট করুন */
      let ext = "jpg";
      if (buf[0] === 0xFF && buf[1] === 0xD8) ext = "jpg";
      else if (buf[0] === 0x89 && buf[1] === 0x50) ext = "png";
      else if (buf.slice(0, 4).toString() === "RIFF") ext = "webp";
      else if (buf.slice(0, 3).toString() === "GIF") ext = "gif";

      const tmpPath = path.join(os.tmpdir(), `nexus_neko_${Date.now()}.${ext}`);
      await fs.writeFile(tmpPath, buf);

      api.sendMessage({
        body: "🐱 Nyaa~ Here's a neko!",
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

      if (event.messageID) {
        try { api.setMessageReaction("✅", event.messageID, threadID, () => {}); } catch (_) {}
      }

    } catch (e) {
      if (event.messageID) {
        try { api.setMessageReaction("❌", event.messageID, threadID, () => {}); } catch (_) {}
      }
      api.sendMessage("❌ Neko failed: " + e.message, threadID);
    }
  }
};
