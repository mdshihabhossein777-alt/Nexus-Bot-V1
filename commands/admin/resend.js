const axios = require("axios");
const fs = require("fs-extra");
const os = require("os");
const path = require("path");

module.exports = {
  name: "resend", version: "1.0.0", role: 0,
  description: "Resend a replied-to message (text + attachments)",
  usage: "/resend  (reply to a message)",
  execute: async function (api, event, args, db) {
    const { threadID, messageReply } = event;
    let tmpFiles = [];
    try {
      if (!messageReply) return api.sendMessage("↩️ Reply to the message you want me to resend.", threadID);
      const body = messageReply.body || "";
      const atts = messageReply.attachments || [];
      const streams = [];
      for (const att of atts) {
        const url = att.url || att.previewUrl;
        if (!url) continue;
        const res = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
        const ext = (att.type === "video" ? "mp4" : att.type === "audio" ? "mp3" : "png");
        const p = path.join(os.tmpdir(), `nexus_resend_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
        await fs.writeFile(p, Buffer.from(res.data));
        tmpFiles.push(p);
        streams.push(fs.createReadStream(p));
      }
      const payload = streams.length
        ? { body: (body || ""), attachment: streams }
        : (body || "📄 (empty message)");
      api.sendMessage(payload, threadID, () => {
        tmpFiles.forEach((f) => { try { fs.removeSync(f); } catch (_) {} });
      });
    } catch (e) {
      tmpFiles.forEach((f) => { try { fs.removeSync(f); } catch (_) {} });
      api.sendMessage("Error: " + e.message, threadID);
    }
  }
};