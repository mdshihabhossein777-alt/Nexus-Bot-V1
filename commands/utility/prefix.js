/**
 * commands/utility/prefix.js
 * NEXUS BOT V1 — Ultra Premium Prefix Card v4
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

/* ═══ Draw 4-point star/sparkle ═══ */
function drawSparkle(ctx, x, y, size, color, blur = 15) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;

  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.18, y - size * 0.18, x + size, y);
  ctx.quadraticCurveTo(x + size * 0.18, y + size * 0.18, x, y + size);
  ctx.quadraticCurveTo(x - size * 0.18, y + size * 0.18, x - size, y);
  ctx.quadraticCurveTo(x - size * 0.18, y - size * 0.18, x, y - size);
  ctx.closePath();
  ctx.fill();

  /* Rays */
  ctx.lineWidth = size * 0.12;
  ctx.strokeStyle = color;
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i;
    const x1 = x + Math.cos(angle) * size * 1.3;
    const y1 = y + Math.sin(angle) * size * 1.3;
    const x2 = x + Math.cos(angle) * size * 2;
    const y2 = y + Math.sin(angle) * size * 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
}

/* ═══ Draw diamond ═══ */
function drawDiamond(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.6, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.6, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  /* Highlight */
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.5);
  ctx.lineTo(size * 0.3, 0);
  ctx.lineTo(0, size * 0.5);
  ctx.lineTo(-size * 0.3, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.shadowBlur = 0;
  ctx.fill();

  /* Center dot */
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
}

/* ═══ Draw ornamental corner ═══ */
function drawCornerOrnament(ctx, x, y, dx, dy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  /* Main L-shape */
  ctx.beginPath();
  ctx.moveTo(x, y + dy * size);
  ctx.lineTo(x, y);
  ctx.lineTo(x + dx * size, y);
  ctx.stroke();

  /* Inner smaller L */
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(x + dx * 8, y + dy * (size - 8));
  ctx.lineTo(x + dx * 8, y + dy * 8);
  ctx.lineTo(x + dx * (size - 8), y + dy * 8);
  ctx.stroke();

  /* Corner dot */
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(x + dx * 4, y + dy * 4, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/* ═══ Draw circular avatar with premium rings ═══ */
async function drawAvatar(ctx, buf, cx, cy, r) {
  /* Multi-layer outer glow */
  for (let i = 6; i >= 1; i--) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + i * 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.08 / i})`;
    ctx.lineWidth = 12;
    ctx.stroke();
  }

  /* Purple glow */
  const outerGlow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2);
  outerGlow.addColorStop(0, "rgba(255, 215, 0, 0.4)");
  outerGlow.addColorStop(0.5, "rgba(255, 20, 147, 0.15)");
  outerGlow.addColorStop(1, "transparent");
  ctx.fillStyle = outerGlow;
  ctx.fillRect(cx - r * 2.5, cy - r * 2.5, r * 5, r * 5);

  /* Main gold gradient ring */
  const ringGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ringGrad.addColorStop(0, "#FFD700");
  ringGrad.addColorStop(0.25, "#FFA500");
  ringGrad.addColorStop(0.5, "#FFFF00");
  ringGrad.addColorStop(0.75, "#FFA500");
  ringGrad.addColorStop(1, "#FFD700");

  ctx.save();
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();

  /* Inner thin white */
  ctx.beginPath();
  ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 2;
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

  /* Sparkles around avatar */
  drawSparkle(ctx, cx - r - 15, cy - 25, 5, "#FFD700", 12);
  drawSparkle(ctx, cx + r + 15, cy + 20, 6, "#ff69b4", 12);
  drawSparkle(ctx, cx + r - 5, cy - r - 10, 4, "#ffffff", 10);
}

/* ═══ Main command ═══ */
module.exports = {
  name: "prefix",
  aliases: ["botprefix"],
  version: "4.0.0",
  role: 0,
  description: "Show premium bot prefix info",
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
      /* ═══ Data ═══ */
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

      const botName = config.brandName || "NEXUS BOT V1";
      const botOwner = config.brandOwner || "Ariyan Shihab";
      const commandsCount = (global.NEXUS && global.NEXUS.commands) ? global.NEXUS.commands.size : 0;

      /* ═══ Get avatar ═══ */
      const avatarBuf = await getAvatar(senderID);

      /* ═══ Canvas ═══ */
      const W = 1000;
      const H = 700;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      /* ═══════ BACKGROUND ═══════ */
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#0a0620");
      bg.addColorStop(0.3, "#1a0a3a");
      bg.addColorStop(0.6, "#2a0a4a");
      bg.addColorStop(1, "#0a0620");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      /* Purple glow (top-left) */
      const glow1 = ctx.createRadialGradient(100, 100, 0, 100, 100, 500);
      glow1.addColorStop(0, "rgba(138, 43, 226, 0.35)");
      glow1.addColorStop(1, "transparent");
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, W, H);

      /* Pink glow (top-right) */
      const glow2 = ctx.createRadialGradient(W - 100, 100, 0, W - 100, 100, 500);
      glow2.addColorStop(0, "rgba(255, 20, 147, 0.3)");
      glow2.addColorStop(1, "transparent");
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, W, H);

      /* Gold glow (center) */
      const glow3 = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 500);
      glow3.addColorStop(0, "rgba(255, 215, 0, 0.15)");
      glow3.addColorStop(1, "transparent");
      ctx.fillStyle = glow3;
      ctx.fillRect(0, 0, W, H);

      /* Cyan glow (bottom) */
      const glow4 = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, 400);
      glow4.addColorStop(0, "rgba(0, 200, 255, 0.2)");
      glow4.addColorStop(1, "transparent");
      ctx.fillStyle = glow4;
      ctx.fillRect(0, 0, W, H);

      /* ═══════ PARTICLE FIELD ═══════ */
      for (let i = 0; i < 80; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const r = 0.5 + Math.random() * 1.8;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + Math.random() * 0.4})`;
        ctx.fill();
      }

      /* Small sparkles scattered */
      const sparklePositions = [
        [120, 150, 6], [880, 180, 7], [200, 500, 5], [800, 520, 6],
        [150, 380, 4], [850, 380, 5], [500, 620, 6], [300, 80, 5],
        [700, 80, 4], [100, 620, 5], [900, 620, 6]
      ];
      for (const [x, y, s] of sparklePositions) {
        const colors = ["#FFD700", "#ff69b4", "#00ffff", "#ffffff", "#ff00ff"];
        const c = colors[Math.floor(Math.random() * colors.length)];
        drawSparkle(ctx, x, y, s, c, 12);
      }

      /* ═══════ BORDER FRAME ═══════ */
      /* Outer border */
      ctx.save();
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 20;
      const borderGrad = ctx.createLinearGradient(0, 0, W, H);
      borderGrad.addColorStop(0, "#FFD700");
      borderGrad.addColorStop(0.33, "#ff69b4");
      borderGrad.addColorStop(0.66, "#8a2be2");
      borderGrad.addColorStop(1, "#FFD700");
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 4;
      roundRect(ctx, 15, 15, W - 30, H - 30, 25);
      ctx.stroke();
      ctx.restore();

      /* Inner thin border */
      ctx.strokeStyle = "rgba(255, 215, 0, 0.3)";
      ctx.lineWidth = 1;
      roundRect(ctx, 25, 25, W - 50, H - 50, 20);
      ctx.stroke();

      /* ═══════ CORNER ORNAMENTS ═══════ */
      drawCornerOrnament(ctx, 35, 35, 1, 1, 40, "#FFD700");
      drawCornerOrnament(ctx, W - 35, 35, -1, 1, 40, "#ff69b4");
      drawCornerOrnament(ctx, 35, H - 35, 1, -1, 40, "#8a2be2");
      drawCornerOrnament(ctx, W - 35, H - 35, -1, -1, 40, "#00ffff");

      /* ═══════ TOP TITLE BAR ═══════ */
      /* Left decorative line */
      ctx.fillStyle = "rgba(255, 215, 0, 0.6)";
      ctx.fillRect(80, 70, 200, 2);
      drawDiamond(ctx, 60, 71, 8, "#FFD700");

      /* Right decorative line */
      ctx.fillStyle = "rgba(255, 215, 0, 0.6)";
      ctx.fillRect(W - 280, 70, 200, 2);
      drawDiamond(ctx, W - 60, 71, 8, "#FFD700");

      /* Title */
      ctx.textAlign = "center";
      ctx.font = "bold 44px Georgia, serif";
      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 25;
      ctx.fillText("P R E F I X", W / 2, 90);
      ctx.shadowBlur = 0;

      /* Subtitle */
      ctx.font = "italic 16px Georgia, serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillText("— Command Information —", W / 2, 118);

      /* ═══════ AVATAR ═══════ */
      await drawAvatar(ctx, avatarBuf, W / 2, 250, 95);

      /* ═══════ USER NAME ═══════ */
      ctx.textAlign = "center";
      ctx.font = "bold 38px Georgia, serif";

      /* Glow */
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#FFD700";
      ctx.fillText(userName, W / 2, 410);

      /* White text on top */
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(userName, W / 2, 410);

      /* Small caption */
      ctx.font = "italic 15px Georgia, serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillText("Welcome back!", W / 2, 438);

      /* ═══════ DIVIDER with diamond ═══════ */
      const divY = 465;
      ctx.fillStyle = "rgba(255, 215, 0, 0.4)";
      ctx.fillRect(120, divY, W / 2 - 150, 1);
      ctx.fillRect(W / 2 + 30, divY, W / 2 - 150, 1);
      drawDiamond(ctx, W / 2, divY, 8, "#FFD700");

      /* ═══════ PREFIX BOX ═══════ */
      const boxW = 480;
      const boxH = 110;
      const boxX = W / 2 - boxW / 2;
      const boxY = 490;

      /* Outer glow */
      ctx.save();
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 25;
      roundRect(ctx, boxX, boxY, boxW, boxH, 20);
      const boxBg = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
      boxBg.addColorStop(0, "rgba(255, 215, 0, 0.12)");
      boxBg.addColorStop(0.5, "rgba(255, 20, 147, 0.08)");
      boxBg.addColorStop(1, "rgba(138, 43, 226, 0.12)");
      ctx.fillStyle = boxBg;
      ctx.fill();
      ctx.restore();

      /* Border */
      roundRect(ctx, boxX, boxY, boxW, boxH, 20);
      const boxBorderGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY);
      boxBorderGrad.addColorStop(0, "rgba(255, 215, 0, 0.7)");
      boxBorderGrad.addColorStop(0.5, "rgba(255, 20, 147, 0.9)");
      boxBorderGrad.addColorStop(1, "rgba(255, 215, 0, 0.7)");
      ctx.strokeStyle = boxBorderGrad;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      /* Label */
      ctx.font = "bold 14px Georgia, serif";
      ctx.fillStyle = "rgba(255, 215, 0, 0.85)";
      ctx.textAlign = "center";
      ctx.fillText("P R E F I X", W / 2, boxY + 30);

      /* Small diamonds on label sides */
      drawDiamond(ctx, W / 2 - 70, boxY + 24, 5, "#FFD700");
      drawDiamond(ctx, W / 2 + 70, boxY + 24, 5, "#FFD700");

      /* Prefix value */
      ctx.font = "bold 58px Georgia, serif";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 25;
      ctx.fillStyle = "#FFD700";
      ctx.fillText(prefix, W / 2, boxY + 88);
      ctx.shadowBlur = 0;

      /* ═══════ FOOTER INFO ═══════ */
      const footY = H - 60;

      /* Divider */
      ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
      ctx.fillRect(200, footY - 15, W - 400, 1);

      /* Footer columns */
      ctx.font = "13px Georgia, serif";

      /* Left — Bot Name */
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255, 215, 0, 0.5)";
      ctx.fillText("BOT", 80, footY + 5);
      ctx.font = "bold 16px Georgia, serif";
      ctx.fillStyle = "#FFD700";
      ctx.fillText(botName, 80, footY + 25);

      /* Center — Owner */
      ctx.textAlign = "center";
      ctx.font = "13px Georgia, serif";
      ctx.fillStyle = "rgba(255, 215, 0, 0.5)";
      ctx.fillText("OWNER", W / 2, footY + 5);
      ctx.font = "bold 16px Georgia, serif";
      ctx.fillStyle = "#ff69b4";
      ctx.fillText(botOwner, W / 2, footY + 25);

      /* Right — Version */
      ctx.textAlign = "right";
      ctx.font = "13px Georgia, serif";
      ctx.fillStyle = "rgba(255, 215, 0, 0.5)";
      ctx.fillText("COMMANDS", W - 80, footY + 5);
      ctx.font = "bold 16px Georgia, serif";
      ctx.fillStyle = "#00ffff";
      ctx.fillText(`${commandsCount}+`, W - 80, footY + 25);

      /* ═══════ Save + send ═══════ */
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