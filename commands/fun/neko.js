const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

module.exports = {
  name: "neko",
  aliases: ["catgirl"],
  version: "1.3.0",
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
      /* ⚡ Multiple sources with proper image URLs */
      const sources = [
        async () => {
          const r = await axios.get("https://nekos.best/api/v2/neko", { timeout: 15000 });
          return r.data?.results?.[0]?.url;
        },
        async () => {
          const r = await axios.get("https://api.waifu.pics/sfw/neko", { timeout: 15000 });
          return r.data?.url;
        },
        async () => {
          const r = await axios.get("https://api.waifu.im/search?included_tags=neko&is_nsfw=false", { timeout: 15000 });
          return r.data?.images?.[0]?.url;
        },
        async () => {
          const r = await axios.get("https://api.catboys.com/img", { timeout: 15000 });
          return r.data?.url;
        },
        async () => {
          const r = await axios.get("https://shiro.gg/api/images/neko", { timeout: 15000 });
          return r.data?.url;
        }
      ];

      let imgUrl = null;
      for (const src of sources) {
        try {
          const url = await src();
          if (url && /^https?:\/\//i.test(url)) {
            imgUrl = url;
            break;
          }
        } catch (_) { continue; }
      }

      if (!imgUrl) {
        if (event.messageID) {
          try { api.setMessageReaction("❌", event.messageID, threadID, () => {}); } catch (_) {}
        }
        return api.sendMessage("❌ Neko image pawa gelo na. Abar try koro.", threadID);
      }

      /* ⚡ Download image */
      const img = await axios.get(imgUrl, {
        responseType: "arraybuffer",
        timeout: 20000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "image/*,*/*"
        },
        maxContentLength: 15 * 1024 * 1024
      });

      const buf = Buffer.from(img.data);

      /* ⚡ Detect actual image type from magic bytes */
      let ext = "jpg";
      if (buf[0] === 0xFF && buf[1] === 0xD8) ext = "jpg";
      else if (buf[0] === 0x89 && buf[1] === 0x50) ext = "png";
      else if (buf.slice(0, 4).toString() === "RIFF") ext = "webp";
      else if (buf.slice(0, 3).toString() === "GIF") ext = "gif";
      else {
        /* Try to get from URL */
        const urlExt = imgUrl.match(/\.(png|jpg|jpeg|gif|webp)(\?|$)/i);
        if (urlExt) ext = urlExt[1].toLowerCase();
      }

      if (buf.length < 1000) throw new Error("Image too small");

      /* ⚡ Save as proper image extension */
      const tmpPath = path.join(os.tmpdir(), `nexus_neko_${Date.now()}.${ext}`);
      await fs.writeFile(tmpPath, buf);

      /* ⚡ Send as file stream with proper filename */
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
// © NEXUS BOT V1 | 
