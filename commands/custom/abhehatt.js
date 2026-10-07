/**
 * commands/custom/abhehatt.js
 * NEXUS BOT V1 — Abhe Hatt (2-face PP replace)
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

/* ═══════════════════════════════════════════════════════════
   FACE POSITIONS — Apnar image onujayi adjust korun
   ═══════════════════════════════════════════════════════════ */
const FACES = {
  /* Black character (left, white hair) — command user */
  black: { x: 340, y: 185, size: 150 },   /* Gojo (left) */

  /* White character (right, black hair) — replied user */
  white: { x: 750, y: 250, size: 140 }    /* Right character */
};

/* ═══ Image path resolver ═══ */
function getImagePath(filename) {
  const candidates = [
    path.join(__dirname, "..", "..", "assets", filename),
    path.join(process.cwd(), "assets", filename),
    "/app/assets/" + filename,
    "/opt/render/project/src/assets/" + filename,
    path.join(os.tmpdir(), filename)
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch (_) {}
  }
  return null;
}

/* ═══ Download FB avatar ═══ */
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

/* ═══ Draw circular PP with color ring ═══ */
async function drawFace(ctx, buf, pos, ringColor) {
  const { x, y, size } = pos;
  const r = size / 2;

  ctx.save();

  /* Outer glow ring */
  ctx.beginPath();
  ctx.arc(x, y, r + 8, 0, Math.PI * 2);
  ctx.strokeStyle = ringColor + "55";
  ctx.lineWidth = 12;
  ctx.stroke();

  /* Main ring */
  ctx.beginPath();
  ctx.arc(x, y, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 5;
  ctx.stroke();

  /* Clip + draw PP */
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (buf) {
    try {
      const img = await loadImage(buf);
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, x - r, y - r, size, size);
    } catch (_) {
      ctx.fillStyle = "#333";
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#333";
    ctx.fill();
  }

  ctx.restore();

  /* Inner white ring */
  ctx.beginPath();
  ctx.arc(x, y, r - 2, 0, Math.PI * 2);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════ */
module.exports = {
  name: "abhehatt",
  aliases: ["abhe", "hatt", "abhehat", "chill"],
  version: "1.0.0",
  role: 0,
  description: "Reply to user with 'abhe hatt' → face replace",
  usage: "Reply to someone + 'abhe hatt'",
  category: "custom",

  /* ═══ Trigger phrases (no prefix) ═══ */
  triggers: {
    text: ["abhe hatt", "abhehatt", "abe hatt", "abhe hat", "hatt abhe"]
  },

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, messageReply, body } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Reply check ═══ */
    if (!messageReply || !messageReply.senderID) {
      react("❓");
      return api.sendMessage(
        "🎬 ABHE HATT\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "📝 How to use:\n" +
        "1. Reply to any user's message\n" +
        "2. Type: abhe hatt\n\n" +
        "💡 You'll be black, they'll be white 😎",
        threadID
      );
    }

    const targetID = String(messageReply.senderID);

    if (targetID === String(senderID)) {
      react("❌");
      return api.sendMessage("❌ Nijer upore abhe hatt kaj korbe na 😅", threadID);
    }

    react("⏳");

    let tmp = null;

    try {
      /* ═══ Load background image ═══ */
      const bgPath = getImagePath("abhe-hatt.jpg");
      if (!bgPath) {
        react("❌");
        return api.sendMessage(
          "❌ Image not found in assets/\n" +
          "📁 Expected: assets/abhe-hatt.jpg",
          threadID
        );
      }

      /* ═══ Get avatars ═══ */
      const [userPP, targetPP] = await Promise.all([
        getAvatar(senderID).catch(() => null),
        getAvatar(targetID).catch(() => null)
      ]);

      /* ═══ Get names ═══ */
      let userName = "User", targetName = "Someone";
      try {
        const ui = await api.getUserInfo([senderID, targetID]);
        if (ui[senderID]?.name) userName = ui[senderID].name.split(" ")[0];
        if (ui[targetID]?.name) targetName = ui[targetID].name.split(" ")[0];
      } catch (_) {}

      /* ═══ Canvas ═══ */
      const bgImg = await loadImage(bgPath);
      const W = bgImg.width;
      const H = bgImg.height;

      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bgImg, 0, 0);

      /* ═══ Draw user PP → BLACK character (left) ═══ */
      const blackPos = {
        x: Math.floor(FACES.black.x * W / 1024),
        y: Math.floor(FACES.black.y * H / 1024),
        size: Math.floor(FACES.black.size * Math.min(W, H) / 1024)
      };
      await drawFace(ctx, userPP, blackPos, "#000000");

      /* ═══ Draw target PP → WHITE character (right) ═══ */
      const whitePos = {
        x: Math.floor(FACES.white.x * W / 1024),
        y: Math.floor(FACES.white.y * H / 1024),
        size: Math.floor(FACES.white.size * Math.min(W, H) / 1024)
      };
      await drawFace(ctx, targetPP, whitePos, "#ffffff");

      /* ═══ Save + Send ═══ */
      tmp = path.join(os.tmpdir(), `abhe_${Date.now()}.png`);
      await fs.writeFile(tmp, canvas.toBuffer("image/png"));

      react("😂");
      api.sendMessage({
        body: `😎 ${userName} → "abhe hatt" → ${targetName} 🤣`,
        mentions: [
          { tag: userName, id: String(senderID) },
          { tag: targetName, id: targetID }
        ],
        attachment: fs.createReadStream(tmp)
      }, threadID, () => {
        try { fs.unlinkSync(tmp); } catch (_) {}
      });

    } catch (e) {
      console.error("[abhehatt] error:", e.message);
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage("❌ " + e.message.slice(0, 60), threadID);
    }
  }
};

// © 2026 NEXUS BOT V1