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
  name: "polaroid", aliases: ["polaroidframe"], version: "1.0.0", role: 0,
  description: "Polaroid frame", usage: "/polaroid @user", category: "imagetools",
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
      const W = 700, H = 850;
      const c = createCanvas(W, H);
      const ctx = c.getContext("2d");
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(-2 * Math.PI / 180);
      ctx.translate(-W / 2, -H / 2);
      ctx.fillStyle = "#f5f5f0";
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      ctx.fillRect(0, 0, W, H);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.drawImage(img, 60, 60, W - 120, W - 120);
      ctx.fillStyle = "rgba(200, 180, 140, 0.15)";
      ctx.fillRect(60, 60, W - 120, W - 120);
      ctx.fillStyle = "#f5f5f0";
      ctx.fillRect(60, W - 40, W - 120, H - W - 20);
      ctx.textAlign = "center";
      ctx.fillStyle = "#333";
      ctx.font = "italic bold 40px cursive, sans-serif";
      ctx.fillText(tname.slice(0, 20), W / 2, W + 40);
      ctx.font = "20px sans-serif";
      ctx.fillStyle = "#888";
      const d = new Date();
      ctx.fillText(`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`, W / 2, W + 90);
      ctx.restore();
      tmp = path.join(os.tmpdir(), `polaroid_${Date.now()}.png`);
      await fs.writeFile(tmp, c.toBuffer("image/png"));
      react("📷");
      api.sendMessage({ body: `📷 ${tname}'s polaroid`, mentions: [{ tag: tname, id: tid }], attachment: fs.createReadStream(tmp) }, threadID, () => { try { fs.unlinkSync(tmp); } catch (_) {} });
    } catch (e) {
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};