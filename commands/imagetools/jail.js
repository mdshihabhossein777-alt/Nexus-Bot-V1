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
  name: "jail", aliases: ["prison", "cell"], version: "2.0.0", role: 0,
  description: "Put user in jail", usage: "/jail @user", category: "imagetools",
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
      const W = 800, H = 800;
      const c = createCanvas(W, H);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#0a0a12";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 80, 80, W - 160, H - 160);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(80, 80, W - 160, H - 160);
      ctx.fillStyle = "rgba(60, 40, 20, 0.25)";
      ctx.fillRect(80, 80, W - 160, H - 160);
      const barW = 28, gap = 85;
      const grad = ctx.createLinearGradient(0, 0, barW, 0);
      grad.addColorStop(0, "#0a0a0a");
      grad.addColorStop(0.3, "#555");
      grad.addColorStop(0.5, "#999");
      grad.addColorStop(0.7, "#555");
      grad.addColorStop(1, "#0a0a0a");
      for (let x = -barW / 2; x < W; x += gap) {
        ctx.fillStyle = grad;
        ctx.fillRect(x, 0, barW, H);
      }
      const hgrad = ctx.createLinearGradient(0, 0, 0, barW);
      hgrad.addColorStop(0, "#0a0a0a");
      hgrad.addColorStop(0.3, "#555");
      hgrad.addColorStop(0.5, "#999");
      hgrad.addColorStop(0.7, "#555");
      hgrad.addColorStop(1, "#0a0a0a");
      [40, H - 40 - barW].forEach((y) => {
        ctx.fillStyle = hgrad;
        ctx.fillRect(0, y, W, barW);
      });
      const vg = ctx.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 500);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(180, 0, 0, 0.9)";
      ctx.fillRect(60, H - 100, W - 120, 60);
      ctx.strokeStyle = "#ff3333";
      ctx.lineWidth = 3;
      ctx.strokeRect(60, H - 100, W - 120, 60);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px sans-serif";
      ctx.fillText(`${tname.toUpperCase()} IN JAIL`, W / 2, H - 58);
      tmp = path.join(os.tmpdir(), `jail_${Date.now()}.png`);
      await fs.writeFile(tmp, c.toBuffer("image/png"));
      react("🔒");
      api.sendMessage({ body: `🔒 <@${tid}> is in jail!`, mentions: [{ tag: tname, id: tid }], attachment: fs.createReadStream(tmp) }, threadID, () => { try { fs.unlinkSync(tmp); } catch (_) {} });
    } catch (e) {
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};