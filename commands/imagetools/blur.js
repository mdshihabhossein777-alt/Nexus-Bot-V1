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
  name: "blur", aliases: ["blurimg"], version: "1.0.0", role: 0,
  description: "Blur a user's profile picture", usage: "/blur @user", category: "imagetools",
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
      const W = 720, H = 720;
      const c = createCanvas(W, H);
      const ctx = c.getContext("2d");
      const small = createCanvas(60, 60);
      const sctx = small.getContext("2d");
      sctx.drawImage(img, 0, 0, 60, 60);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(small, 0, 0, W, H);
      ctx.font = "bold 40px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.textAlign = "center";
      ctx.shadowColor = "#000"; ctx.shadowBlur = 10;
      ctx.fillText(`${tname}`, W / 2, H - 30);
      ctx.shadowBlur = 0;
      tmp = path.join(os.tmpdir(), `blur_${Date.now()}.png`);
      await fs.writeFile(tmp, c.toBuffer("image/png"));
      react("✅");
      api.sendMessage({ body: `💨 Blurred ${tname}`, mentions: [{ tag: tname, id: tid }], attachment: fs.createReadStream(tmp) }, threadID, () => { try { fs.unlinkSync(tmp); } catch (_) {} });
    } catch (e) {
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};