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
  name: "wasted", aliases: ["gta-wasted"], version: "1.0.0", role: 0,
  description: "GTA wasted screen", usage: "/wasted @user", category: "imagetools",
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
      ctx.fillStyle = "rgba(120, 0, 0, 0.5)";
      ctx.fillRect(0, 0, W, H);
      const vg = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 500);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.9)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.font = "bold 110px serif";
      ctx.strokeStyle = "#000"; ctx.lineWidth = 8;
      ctx.strokeText("WASTED", W / 2, H / 2 + 30);
      const grad = ctx.createLinearGradient(0, H / 2 - 60, 0, H / 2 + 60);
      grad.addColorStop(0, "#ff2222");
      grad.addColorStop(1, "#aa0000");
      ctx.fillStyle = grad;
      ctx.fillText("WASTED", W / 2, H / 2 + 30);
      tmp = path.join(os.tmpdir(), `wasted_${Date.now()}.png`);
      await fs.writeFile(tmp, c.toBuffer("image/png"));
      react("💀");
      api.sendMessage({ body: "💀 WASTED", attachment: fs.createReadStream(tmp) }, threadID, () => { try { fs.unlinkSync(tmp); } catch (_) {} });
    } catch (e) {
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};