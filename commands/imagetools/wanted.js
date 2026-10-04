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
  name: "wanted", aliases: ["poster"], version: "1.0.0", role: 0,
  description: "Wanted poster", usage: "/wanted @user", category: "imagetools",
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
      const W = 700, H = 900;
      const c = createCanvas(W, H);
      const ctx = c.getContext("2d");
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#f4e4c1");
      bg.addColorStop(0.5, "#e8d5a8");
      bg.addColorStop(1, "#d4b878");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#8b6f3a";
      ctx.fillRect(50, 180, W - 100, 500);
      ctx.drawImage(img, 60, 190, W - 120, 480);
      ctx.fillStyle = "rgba(139, 90, 43, 0.35)";
      ctx.fillRect(60, 190, W - 120, 480);
      ctx.textAlign = "center";
      ctx.font = "bold 90px serif";
      ctx.fillStyle = "#3b2410";
      ctx.fillText("WANTED", W / 2, 120);
      ctx.font = "bold 44px serif";
      ctx.fillStyle = "#2a1a08";
      ctx.fillText(tname.toUpperCase().slice(0, 20), W / 2, 745);
      ctx.font = "bold 30px serif";
      ctx.fillStyle = "#5a3a15";
      ctx.fillText("DEAD OR ALIVE", W / 2, 800);
      ctx.font = "bold 26px serif";
      ctx.fillStyle = "#8b0000";
      ctx.fillText("REWARD: $1,000,000", W / 2, 850);
      ctx.strokeStyle = "#3b2410";
      ctx.lineWidth = 8;
      ctx.strokeRect(15, 15, W - 30, H - 30);
      tmp = path.join(os.tmpdir(), `wanted_${Date.now()}.png`);
      await fs.writeFile(tmp, c.toBuffer("image/png"));
      react("🤠");
      api.sendMessage({ body: `🤠 WANTED: ${tname}`, mentions: [{ tag: tname, id: tid }], attachment: fs.createReadStream(tmp) }, threadID, () => { try { fs.unlinkSync(tmp); } catch (_) {} });
    } catch (e) {
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};