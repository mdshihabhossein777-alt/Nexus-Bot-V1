const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

module.exports = {
  name: "neko",
  aliases: ["catgirl"],
  version: "1.2.0",
  role: 0,
  description: "Get a random neko image (SFW)",
  usage: "/neko",
  execute: async function (api, event, args, db) {
    const { threadID } = event;

    /* React ⏳ */
    if (event.messageID) {
      try { api.setMessageReaction("⏳", event.messageID, threadID, () => {}); } catch (_) {}
    }

    try {
      /* 1. Random neko image URL nao (multiple source fallback) */
      let imgUrl = null;

      /* Source 1: nekos.best */
      try {
        const r = await axios.get("https://nekos.best/api/v2/neko", { timeout: 15000 });
        imgUrl = r.data?.results?.[0]?.url;
      } catch (_) {}

      /* Source 2: waifu.pics */
      if (!imgUrl) {
        try {
          const r = await axios.get("https://api.waifu.pics/sfw/neko", { timeout: 15000 });
          imgUrl = r.data?.url;
        } catch (_) {}
      }

      /* Source 3: nekos.life */
      if (!imgUrl) {
        try {
          const r = await axios.get("https://nekos.life/api/v2/img/neko", { timeout: 15000 });
          imgUrl = r.data?.url;
        } catch (_) {}
      }

      if (!imgUrl) {
        if (event.messageID) {
          try { api.setMessageReaction("❌", event.messageID, threadID, () => {}); } catch (_) {}
        }
        return api.sendMessage("❌ Neko image pawa gelo na. Abar try koro.", threadID);
      }

      /* 2. Image download koro */
      const img = await axios.get(imgUrl, {
        responseType: "arraybuffer",
        timeout: 20000,
        headers: { "User-Agent": "Mozilla/5.0" },
        maxContentLength: 15 * 1024 * 1024
      });

      /* 3. Temp file save koro */
      const ext = imgUrl.match(/\.(png|jpg|jpeg|gif|webp)/i)?.[1] || "jpg";
      const tmpPath = path.join(os.tmpdir(), `nexus_neko_${Date.now()}.${ext}`);
      await fs.writeFile(tmpPath, Buffer.from(img.data));

      /* 4. File stream hishebe pathao */
      api.sendMessage({
        body: "🐱 Nyaa~ Here's a neko!",
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

      /* React ✅ */
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
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app
