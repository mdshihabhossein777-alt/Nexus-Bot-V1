const QRCode = require("qrcode");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");
module.exports = {
  name: "qr", aliases: ["qrgen"], version: "1.0.0", role: 0,
  description: "Generate a QR code from text", usage: "/qr <text or url>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    let tmp = null;
    try {
      const text = args.join(" ").trim();
      if (!text) return api.sendMessage("📱 Usage: /qr <text or url>", threadID);
      tmp = path.join(os.tmpdir(), `qr_${Date.now()}.png`);
      await QRCode.toFile(tmp, text, { width: 512, margin: 2 });
      api.sendMessage({
        body: `📱 QR Code: ${text.slice(0, 100)}`,
        attachment: fs.createReadStream(tmp)
      }, threadID, () => { try { fs.removeSync(tmp); } catch (_) {} });
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app