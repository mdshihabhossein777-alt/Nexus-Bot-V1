// commands/fun/waifu.js - NEXUS V1 - Waifu (Fixed .bin issue)
const axios = require("axios");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

module.exports = {
  name: "waifu",
  aliases: ["waifuimg"],
  version: "4.0.0",
  role: 0,
  description: "Random anime waifu image (SFW)",
  usage: "/waifu",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    let tmpPath = null;

    try {
      /* Fetch image URL */
      const r = await axios.get("https://api.waifu.im/images?IsNsfw=False", {
        headers: { "User-Agent": "NexusBot/1.0" },
        timeout: 15000
      });

      const items = r.data?.items;
      if (!items || items.length === 0) throw new Error("No images from API.");

      const imageUrl = items[0].url;
      if (!imageUrl) throw new Error("No image URL.");

      /* Download image buffer */
      const img = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 20000,
        headers: { "User-Agent": "NexusBot/1.0" }
      });

      const buffer = Buffer.from(img.data);

      /* ⚡ Save as .jpg (KEY FIX) */
      tmpPath = path.join(os.tmpdir(), `nexus_waifu_${Date.now()}.jpg`);
      await fs.writeFile(tmpPath, buffer);

      /* Send via createReadStream */
      api.sendMessage({
        body: "💖 Here's your waifu!",
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[waifu] error:", e.message);
      api.sendMessage("❌ Waifu failed: " + e.message, threadID);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    }
  }
};