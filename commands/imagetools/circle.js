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
  name: "circle", aliases: ["circleavatar"], version: "1.0.0", role: 0,
  description: "Circle avatar", usage: "/circle @user", category: "imagetools",
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
      const W = 720, H = 720;
      const c = createCanvas(W, H);
      const ctx = c.getContext("2d");
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#ff6ba9");
      bg.addColorStop(0.5, "#a18cd1");
      bg.addColorStop(1, "#6a11cb");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, r = 260;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 30;
      ctx.stroke();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
      ctx.strokeStyle = "#ff2266";
      ctx.lineWidth = 6;
      ctx.stroke();
      tmp = path.join(os.tmpdir(), `circle_${Date.now()}.png`);
      await fs.writeFile(tmp, c.toBuffer("image/png"));
      react("⭕");
      api.sendMessage({ body: "⭕ Circle avatar", attachment: fs.createReadStream(tmp) }, threadID, () => { try { fs.unlinkSync(tmp); } catch (_) {} });
    } catch (e) {
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};