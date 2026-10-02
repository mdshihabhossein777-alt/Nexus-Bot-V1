const fs = require("fs-extra");
const os = require("os");
const path = require("path");
const axios = require("axios");

module.exports = {
  name: "groupimg", aliases: ["setgroupimg", "gimg"], version: "1.0.0", role: 1,
  description: "Change the group photo from a URL or a replied image",
  usage: "/groupimg <image url> | reply to an image",
  execute: async function (api, event, args, db) {
    const { threadID, messageReply } = event;
    let tmp = null;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      let url = args[0];
      if (!url && messageReply && messageReply.attachments && messageReply.attachments.length) {
        const att = messageReply.attachments.find((a) => a.type === "photo" || a.type === "image");
        if (att) url = att.url || att.previewUrl;
      }
      if (!url || !/^https?:\/\//i.test(url)) {
        return api.sendMessage("📝 Usage: /groupimg <image url> — or reply to an image.", threadID);
      }
      const res = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
      tmp = path.join(os.tmpdir(), `nexus_gimg_${Date.now()}.png`);
      await fs.writeFile(tmp, Buffer.from(res.data));
      await api.changeGroupImage(fs.createReadStream(tmp), threadID);
      api.sendMessage("✅ Group photo updated.", threadID);
    } catch (e) {
      api.sendMessage("Error: " + e.message, threadID);
    } finally {
      if (tmp) setTimeout(() => { try { fs.removeSync(tmp); } catch (_) {} }, 5000);
    }
  }
};