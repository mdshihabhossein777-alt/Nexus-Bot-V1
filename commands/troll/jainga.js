/**
 * commands/troll/jainga.js
 * NEXUS BOT V1 — Character face replace with user PP
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

/* ═══════════════════════════════════════════════════════════
   FACE POSITION — Apnar image onujayi adjust korun
   ═══════════════════════════════════════════════════════════ */
const FACE_POSITION = {
  x: 400,           /* Face center X (pixel) */
  y: 320,           /* Face center Y (pixel) */
  size: 200         /* Face circle diameter (pixel) */
};

/* ═══ Image path resolver ═══ */
function getImagePath(filename) {
  const candidates = [
    path.join(__dirname, "..", "..", "assets", filename),
    path.join(process.cwd(), "assets", filename),
    "/app/assets/" + filename,
    "/opt/render/project/src/assets/" + filename,
    process.cwd() + "/assets/" + filename
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        console.log("[jainga] bg found: " + p);
        return p;
      }
    } catch (_) {}
  }
  console.log("[jainga] bg not found: " + filename);
  return null;
}

/* ═══ Get FB avatar ═══ */
async function getAvatar(uid) {
  const urls = [
    `https://graph.facebook.com/${uid}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
    `https://graph.facebook.com/${uid}/picture?type=large&width=720&height=720`
  ];
  for (const url of urls) {
    try {
      const r = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 12000,
        maxRedirects: 5,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const b = Buffer.from(r.data);
      if (b.length > 1000) return b;
    } catch (_) { continue; }
  }
  return null;
}

module.exports = {
  name: "jainga",
  aliases: ["face", "charpp", "replace"],
  version: "1.0.0",
  role: 0,
  description: "Replace character face with user's PP",
  usage: "/jainga @user",
  category: "troll",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    react("⏳");

    let tmp = null;

    try {
      /* ═══ Step 1 — Target user ═══ */
      let targetID = String(senderID);
      if (mentions && Object.keys(mentions).length) {
        targetID = String(Object.keys(mentions)[0]);
      } else if (messageReply && messageReply.senderID) {
        targetID = String(messageReply.senderID);
      }

      /* ═══ Step 2 — Get target name ═══ */
      let targetName = "User";
      try {
        const ui = await api.getUserInfo(targetID);
        if (ui && ui[targetID] && ui[targetID].name) {
          targetName = ui[targetID].name.split(" ")[0];
        }
      } catch (_) {}

      /* ═══ Step 3 — Load background image ═══ */
      const bgPath = getImagePath("jainga.jpg");
      if (!bgPath) {
        react("❌");
        return api.sendMessage(
          "❌ Image not found in assets/\n" +
          "📁 Expected: assets/jainga.jpg",
          threadID
        );
      }

      /* ═══ Step 4 — Download user PP ═══ */
      const userPP = await getAvatar(targetID).catch(() => null);

      /* ═══ Step 5 — Load background as canvas ═══ */
      const bgImg = await loadImage(bgPath);
      const W = bgImg.width;
      const H = bgImg.height;

      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bgImg, 0, 0);

      /* ═══ Step 6 — Overlay user PP on face ═══ */
      if (userPP) {
        try {
          const ppImg = await loadImage(userPP);

          const { x, y, size } = FACE_POSITION;
          const radius = size / 2;

          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          const aspectImg = ppImg.width / ppImg.height;
          let sx, sy, sw, sh;
          if (aspectImg > 1) {
            sh = ppImg.height;
            sw = sh;
            sx = (ppImg.width - sw) / 2;
            sy = 0;
          } else {
            sw = ppImg.width;
            sh = sw;
            sx = 0;
            sy = (ppImg.height - sh) / 2;
          }
          ctx.drawImage(ppImg, sx, sy, sw, sh, x - radius, y - radius, size, size);
          ctx.restore();

          /* Soft border */
          ctx.beginPath();
          ctx.arc(x, y, radius - 1, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0,0,0,0.15)";
          ctx.lineWidth = 2;
          ctx.stroke();
        } catch (e) {
          console.log("[jainga] PP overlay failed: " + e.message);
        }
      }

      /* ═══ Step 7 — Save + Send ═══ */
      tmp = path.join(os.tmpdir(), `jainga_${Date.now()}.png`);
      await fs.writeFile(tmp, canvas.toBuffer("image/png"));

      react("😂");
      api.sendMessage({
        body: `😂 ${targetName}`,
        mentions: [{ tag: targetName, id: targetID }],
        attachment: fs.createReadStream(tmp)
      }, threadID, () => {
        try { fs.unlinkSync(tmp); } catch (_) {}
      });

    } catch (e) {
      console.error("[jainga] error: " + e.message);
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage("❌ " + e.message.slice(0, 60), threadID);
    }
  }
};