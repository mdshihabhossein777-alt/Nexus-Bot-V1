/**
 * commands/utility/prefix.js
 * NEXUS BOT V1 — Premium prefix info card
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const axios = require("axios");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const cooldowns = new Map();
const COOLDOWN_MS = 5000;

/* ═══ Get user avatar ═══ */
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

/* ═══ Round rect helper ═══ */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ═══ Draw circular avatar with glow ═══ */
async function drawAvatar(ctx, buf, cx, cy, r) {
  /* Outer glow layers */
  for (let i = 3; i >= 1; i--) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + i * 6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.15 / i})`;
    ctx.lineWidth = 8;
    ctx.stroke();
  }

  /* Gradient ring */
  const ringGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ringGrad.addColorStop(0, "#FFD700");
  ringGrad.addColorStop(0.5, "#FFA500");
  ringGrad.addColorStop(1, "#FFD700");

  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 6;
  ctx.stroke();

  /* Clip + draw avatar */
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (buf) {
    try {
      const img = await loadImage(buf);
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, cx - r, cy - r, r * 2, r * 2);
    } catch (_) {
      ctx.fillStyle = "#1a1a2e";
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#1a1a2e";
    ctx.fill();
  }
  ctx.restore();

  /* Inner white ring */
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

/* ═══ Main command ═══ */
module.exports = {
  name: "prefix",
  aliases: ["botprefix"],
  version: "3.0.0",
  role: 0,
  description: "Show bot prefix info",
  usage: "/prefix",
  category: "utility",

  checkTrigger: function (body) {
    if (!body) return false;
    const t = body.trim().toLowerCase();
    if (t === "prefix") return true;
    if (t === "botprefix") return true;
    if (t === "bot prefix") return true;
    return false;
  },

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* Cooldown */
    const now = Date.now();
    const last = cooldowns.get(String(threadID)) || 0;
    if (now - last < COOLDOWN_MS) return;
    cooldowns.set(String(threadID), now);
    if (cooldowns.size > 5000) cooldowns.clear();

    react("⏳");

    try {
      /* ═══ Get data ═══ */
      let prefix = config.prefix || "/";
      if (event.isGroup) {
        try {
          const g = await db.getGroup(threadID);
          if (g && g.settings && g.settings.prefix) prefix = g.settings.prefix;
        } catch (_) {}
      }

      let userName = "User";
      try {
        const ui = await api.getUserInfo(senderID);
        if (ui && ui[senderID] && ui[senderID].name) {
          userName = ui[senderID].name;
        }
      } catch (_) {}

      /* ═══ Get avatar ═══ */
      const avatarBuf = await getAvatar(senderID);

      /* ═══ Canvas ═══ */
      const W = 900;
      const H = 600;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      /* ═══ Background gradient (premium dark) ═══ */
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#0f0c29");
      bg.addColorStop(0.5, "#302b63");
      bg.addColorStop(1, "#24243e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      /* ═══ Radial glow (center top) ═══ */
      const glow1 = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 500);
      glow1.addColorStop(0, "rgba(255, 215, 0, 0.25)");
      glow1.addColorStop(1, "rgba(255, 215, 0, 0)");
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, W, H);

      /* ═══ Purple glow bottom-left ═══ */
      const glow2 = ctx.createRadialGradient(0, H, 0, 0, H, 400);
      glow2.addColorStop(0, "rgba(138, 43, 226, 0.3)");
      glow2.addColorStop(1, "rgba(138, 43, 226, 0)");
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, W, H);

      /* ═══ Pink glow top-right ═══ */
      const glow3 = ctx.createRadialGradient(W, 0, 0, W, 0, 400);
      glow3.addColorStop(0, "rgba(255, 20, 147, 0.25)");
      glow3.addColorStop(1, "rgba(255, 20, 147, 0)");
      ctx.fillStyle = glow3;
      ctx.fillRect(0, 0, W, H);

      /* ═══ Decorative circles ═══ */
      for (let i = 0; i < 15; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const r = 1 + Math.random() * 3;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.3})`;
        ctx.fill();
      }

      /* ═══ Top border line (gradient) ═══ */
      const borderGrad = ctx.createLinearGradient(0, 0, W, 0);
      borderGrad.addColorStop(0, "rgba(255, 215, 0, 0)");
      borderGrad.addColorStop(0.5, "rgba(255, 215, 0, 1)");
      borderGrad.addColorStop(1, "rgba(255, 215, 0, 0)");
      ctx.fillStyle = borderGrad;
      ctx.fillRect(0, 0, W, 3);

      /* ═══ Bottom border line ═══ */
      ctx.fillStyle = borderGrad;
      ctx.fillRect(0, H - 3, W, 3);

      /* ═══ Title ═══ */
      ctx.textAlign = "center";
      ctx.font = "bold 42px sans-serif";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 25;
      ctx.fillStyle = "#FFD700";
      ctx.fillText("✦  P R E F I X  ✦", W / 2, 85);
      ctx.shadowBlur = 0;

      /* Subtitle line */
      ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
      ctx.fillRect(W / 2 - 200, 105, 400, 1);

      /* ═══ Avatar (centered, top area) ═══ */
      await drawAvatar(ctx, avatarBuf, W / 2, 230, 90);

      /* ═══ User name (below avatar) ═══ */
      ctx.textAlign = "center";
      ctx.font = "bold 36px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(255, 215, 0, 0.8)";
      ctx.shadowBlur = 15;
      ctx.fillText(`👋 ${userName}`, W / 2, 375);
      ctx.shadowBlur = 0;

      /* ═══ Divider ═══ */
      const divGrad = ctx.createLinearGradient(100, 0, W - 100, 0);
      divGrad.addColorStop(0, "rgba(255, 215, 0, 0)");
      divGrad.addColorStop(0.5, "rgba(255, 215, 0, 0.6)");
      divGrad.addColorStop(1, "rgba(255, 215, 0, 0)");
      ctx.fillStyle = divGrad;
      ctx.fillRect(100, 410, W - 200, 2);

      /* ═══ Prefix display box ═══ */
      const boxW = 400;
      const boxH = 100;
      const boxX = W / 2 - boxW / 2;
      const boxY = 445;

      /* Box background (glass effect) */
      roundRect(ctx, boxX, boxY, boxW, boxH, 20);
      const boxBg = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
      boxBg.addColorStop(0, "rgba(255, 215, 0, 0.15)");
      boxBg.addColorStop(1, "rgba(255, 215, 0, 0.08)");
      ctx.fillStyle = boxBg;
      ctx.fill();

      /* Box border */
      roundRect(ctx, boxX, boxY, boxW, boxH, 20);
      ctx.strokeStyle = "rgba(255, 215, 0, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      /* "Prefix" label */
      ctx.fillStyle = "rgba(255, 215, 0, 0.7)";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚡ PREFIX ⚡", W / 2, boxY + 30);

      /* Prefix value */
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 52px sans-serif";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 20;
      ctx.fillText(prefix, W / 2, boxY + 80);
      ctx.shadowBlur = 0;

      /* ═══ Bottom branding ═══ */
      ctx.textAlign = "center";
      ctx.font = "bold 20px sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillText("💎 NEXUS BOT V1", W / 2, H - 20);

      /* ═══ Corner accents ═══ */
      ctx.strokeStyle = "rgba(255, 215, 0, 0.8)";
      ctx.lineWidth = 3;
      const cSize = 30;
      const cPos = [
        [20, 20, 1, 1],
        [W - 20, 20, -1, 1],
        [20, H - 20, 1, -1],
        [W - 20, H - 20, -1, -1]
      ];
      for (const [x, y, dx, dy] of cPos) {
        ctx.beginPath();
        ctx.moveTo(x, y + dy * cSize);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx * cSize, y);
        ctx.stroke();
      }

      /* ═══ Save + send ═══ */
      const tmpPath = path.join(os.tmpdir(), `prefix_${Date.now()}.png`);
      await fs.writeFile(tmpPath, canvas.toBuffer("image/png"));

      react("✨");
      api.sendMessage({
        body: "",
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[prefix] error:", e.message);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1