const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

async function getAvatar(uid) {
  const urls = [
    `https://graph.facebook.com/${uid}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
    `https://graph.facebook.com/${uid}/picture?type=large&width=720&height=720`
  ];
  for (const url of urls) {
    try {
      const r = await axios.get(url, { responseType: "arraybuffer", timeout: 15000, maxRedirects: 5, headers: { "User-Agent": "Mozilla/5.0" } });
      const b = Buffer.from(r.data);
      if (b.length > 1000) return b;
    } catch (_) { continue; }
  }
  return null;
}

module.exports = {
  name: "triggered", aliases: ["trig"], version: "1.0.0", role: 0,
  description: "Triggered anime effect", usage: "/triggered @user", category: "imagetools",
  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;
    const react = (e) => { if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {} };
    react("⏳");
    let tmp = null;
    try {
      let tid = String(senderID);
      if (mentions && Object.keys(mentions).length) tid = String(Object.keys(mentions)[0]);
      else if (messageReply && messageReply.senderID) tid = String(messageReply.senderID);
      const av = await getAvatar(tid);
      if (!av) throw new Error("no avatar");
      const img = await loadImage(av);
      const W = 800, H = 800;
      const c = createCanvas(W, H);
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, W, H);
      ctx.fillStyle = "rgba(255, 0, 0, 0.35)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(0, 0, W, H);
      const bh = 140;
      ctx.fillStyle = "rgba(200, 0, 0, 0.9)";
      ctx.fillRect(0, H - bh - 40, W, bh);
      ctx.textAlign = "center";
      ctx.font = "bold 80px serif";
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000"; ctx.lineWidth = 5;
      ctx.strokeText("TRIGGERED", W / 2, H - 65);
      ctx.fillText("TRIGGERED", W / 2, H - 65);
      tmp = path.join(os.tmpdir(), `trig_${Date.now()}.png`);
      await fs.writeFile(tmp, c.toBuffer("image/png"));
      react("😡");
      api.sendMessage({ body: "😡 TRIGGERED!", attachment: fs.createReadStream(tmp) }, threadID, () => { try { fs.unlinkSync(tmp); } catch (_) {} });
    } catch (e) {
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};