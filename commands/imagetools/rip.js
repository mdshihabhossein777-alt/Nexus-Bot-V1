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
  name: "rip", aliases: ["tombstone"], version: "1.0.0", role: 0,
  description: "RIP tombstone", usage: "/rip @user", category: "imagetools",
  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;
    const react = (e) => { if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {} };
    react("⏳");
    let tmp = null;
    try {
      let tid = String(senderID);
      if (mentions && Object.keys(mentions).length) tid = String(Object.keys(mentions)[0]);
      else if (messageReply && messageReply.senderID) tid = String(messageReply.senderID);
      let tname = "User";
      try { const ui = await api.getUserInfo(tid); tname = ui[tid]?.name || "User"; } catch (_) {}
      const av = await getAvatar(tid);
      if (!av) throw new Error("no avatar");
      const img = await loadImage(av);
      const W = 800, H = 900;
      const c = createCanvas(W, H);
      const ctx = c.getContext("2d");
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#4a5568");
      sky.addColorStop(0.6, "#2d3748");
      sky.addColorStop(1, "#1a202c");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#1a202c";
      ctx.fillRect(0, H - 150, W, 150);
      const tsX = W / 2 - 180;
      const tsY = 200;
      const tsW = 360;
      const tsH = 550;
      const r = 180;
      ctx.fillStyle = "#9ca3af";
      ctx.beginPath();
      ctx.moveTo(tsX, tsY + r);
      ctx.arc(tsX + r, tsY + r, r, Math.PI, 0);
      ctx.lineTo(tsX + tsW, tsY + tsH);
      ctx.lineTo(tsX, tsY + tsH);
      ctx.closePath();
      ctx.fill();
      const cx = W / 2;
      const cy = tsY + r + 40;
      const cr = 100;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, cx - cr, cy - cr, cr * 2, cr * 2);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(80, 50, 20, 0.4)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.strokeStyle = "#4a5568";
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = "#1a202c";
      ctx.font = "bold 70px serif";
      ctx.fillText("RIP", cx, cy + cr + 80);
      ctx.font = "bold 30px serif";
      ctx.fillText(tname.slice(0, 20), cx, cy + cr + 130);
      ctx.font = "22px serif";
      ctx.fillStyle = "#374151";
      ctx.fillText("Rest In Peace", cx, cy + cr + 180);
      tmp = path.join(os.tmpdir(), `rip_${Date.now()}.png`);
      await fs.writeFile(tmp, c.toBuffer("image/png"));
      react("⚰️");
      api.sendMessage({ body: `⚰️ RIP ${tname}`, mentions: [{ tag: tname, id: tid }], attachment: fs.createReadStream(tmp) }, threadID, () => { try { fs.unlinkSync(tmp); } catch (_) {} });
    } catch (e) {
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};