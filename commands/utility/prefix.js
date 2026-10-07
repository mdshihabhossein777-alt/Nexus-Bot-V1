/**
 * commands/utility/prefix.js
 * NEXUS BOT V1 — Ultra Premium Prefix Card v5
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const axios = require("axios");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const cooldowns = new Map();
const COOLDOWN_MS = 5000;

const SERIF = "Georgia, 'Times New Roman', 'DejaVu Serif', serif";
const SANS  = "Arial, 'Segoe UI', 'DejaVu Sans', sans-serif";

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

/* ═══ 4-point sparkle ═══ */
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

  ctx.lineWidth = Math.max(1, size * 0.12);
  ctx.strokeStyle = color;
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * size * 1.3, y + Math.sin(a) * size * 1.3);
    ctx.lineTo(x + Math.cos(a) * size * 2,   y + Math.sin(a) * size * 2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
}

/* ═══ Diamond ═══ */
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

  ctx.beginPath();
  ctx.moveTo(0, -size * 0.5);
  ctx.lineTo(size * 0.3, 0);
  ctx.lineTo(0, size * 0.5);
  ctx.lineTo(-size * 0.3, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.shadowBlur = 0;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
}

/* ═══ Corner ornament ═══ */
function drawCornerOrnament(ctx, x, y, dx, dy, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.moveTo(x, y + dy * size);
  ctx.lineTo(x, y);
  ctx.lineTo(x + dx * size, y);
  ctx.stroke();

  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(x + dx * 8, y + dy * (size - 8));
  ctx.lineTo(x + dx * 8, y + dy * 8);
  ctx.lineTo(x + dx * (size - 8), y + dy * 8);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(x + dx * 4, y + dy * 4, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/* ═══ Auto-shrink text to fit width ═══ */
function fitText(ctx, text, maxWidth, baseSize, minSize, fontFamily, weight = "bold") {
  let size = baseSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

/* ═══ Circular avatar with premium rings (FIXED ORDER) ═══ */
async function drawAvatar(ctx, buf, cx, cy, r, fallbackText = "?") {
  /* 1) Ambient glow FIRST so rings sit on top */
  const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.2);
  glow.addColorStop(0, "rgba(255, 215, 0, 0.35)");
  glow.addColorStop(0.45, "rgba(255, 20, 147, 0.18)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.save();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  /* 2) Pulsing soft rings */
  for (let i = 6; i >= 1; i--) {
    ctx.beginPath();
    ctx.arc(cx, cy, r + i * 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.06 / i})`;
    ctx.lineWidth = 10;
    ctx.stroke();
  }

  /* 3) Main gold gradient ring */
  const ringGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ringGrad.addColorStop(0,    "#FFD700");
  ringGrad.addColorStop(0.25, "#FFA500");
  ringGrad.addColorStop(0.5,  "#FFFF6B");
  ringGrad.addColorStop(0.75, "#FFA500");
  ringGrad.addColorStop(1,    "#FFD700");

  ctx.save();
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();

  /* 4) Inner white thin line */
  ctx.beginPath();
  ctx.arc(cx, cy, r + 1.5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();

  /* 5) Clip + draw avatar (with gradient fallback) */
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  let drawn = false;
  if (buf) {
    try {
      const img = await loadImage(buf);
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, cx - r, cy - r, r * 2, r * 2);
      drawn = true;
    } catch (_) {}
  }
  if (!drawn) {
    const ph = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    ph.addColorStop(0, "#2a1a4a");
    ph.addColorStop(1, "#1a0a2a");
    ctx.fillStyle = ph;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.fillStyle = "#FFD700";
    ctx.font = `bold ${Math.floor(r * 0.9)}px ${SERIF}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((fallbackText || "?").charAt(0).toUpperCase(), cx, cy + 4);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();

  /* 6) Sparkles around the avatar */
  drawSparkle(ctx, cx - r - 15, cy - 25, 5,   "#FFD700", 12);
  drawSparkle(ctx, cx + r + 15, cy + 20, 6,   "#ff69b4", 12);
  drawSparkle(ctx, cx + r - 5,  cy - r - 10, 4, "#ffffff", 10);
  drawSparkle(ctx, cx - r + 10, cy + r + 5,  3.5, "#00ffff", 10);
}

/* ═══ Main command ═══ */
module.exports = {
  name: "prefix",
  aliases: ["botprefix"],
  version: "5.0.0",
  role: 0,
  description: "Show premium bot prefix info",
  usage: "/prefix",
  category: "utility",

  checkTrigger: function (body) {
    if (!body) return false;
    const t = body.trim().toLowerCase();
    return t === "prefix" || t === "botprefix" || t === "bot prefix";
  },

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) {
        try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
      }
    };

    /* Cooldown */
    const now = Date.now();
    const key = String(threadID);
    const last = cooldowns.get(key) || 0;
    if (now - last < COOLDOWN_MS) return;
    cooldowns.set(key, now);
    /* Evict oldest instead of nuking everything */
    if (cooldowns.size > 5000) {
      const firstKey = cooldowns.keys().next().value;
      cooldowns.delete(firstKey);
    }

    react("⏳");

    let tmpPath = null;

    try {
      /* ═══ Data ═══ */
      let prefix = config.prefix || "/";
      if (event.isGroup && db && typeof db.getGroup === "function") {
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

      const botName  = config.brandName  || "NEXUS BOT V1";
      const botOwner = config.brandOwner || "Ariyan Shihab";

      let commandsCount = 0;
      if (global.NEXUS && global.NEXUS.commands) {
        if (typeof global.NEXUS.commands.size === "number") {
          commandsCount = global.NEXUS.commands.size;
        } else if (typeof global.NEXUS.commands === "object") {
          commandsCount = Object.keys(global.NEXUS.commands).length;
        }
      }

      /* ═══ Avatar (non-blocking if fails) ═══ */
      const avatarBuf = await getAvatar(senderID).catch(() => null);

      /* ═══ Canvas ═══ */
      const W = 1000;
      const H = 720;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      /* ═══════ BACKGROUND ═══════ */
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0,   "#0a0620");
      bg.addColorStop(0.3, "#1a0a3a");
      bg.addColorStop(0.6, "#2a0a4a");
      bg.addColorStop(1,   "#0a0620");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      /* Ambient glows */
      const glow1 = ctx.createRadialGradient(100, 100, 0, 100, 100, 500);
      glow1.addColorStop(0, "rgba(138, 43, 226, 0.35)");
      glow1.addColorStop(1, "transparent");
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, W, H);

      const glow2 = ctx.createRadialGradient(W - 100, 100, 0, W - 100, 100, 500);
      glow2.addColorStop(0, "rgba(255, 20, 147, 0.30)");
      glow2.addColorStop(1, "transparent");
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, W, H);

      const glow3 = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 500);
      glow3.addColorStop(0, "rgba(255, 215, 0, 0.15)");
      glow3.addColorStop(1, "transparent");
      ctx.fillStyle = glow3;
      ctx.fillRect(0, 0, W, H);

      const glow4 = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, 400);
      glow4.addColorStop(0, "rgba(0, 200, 255, 0.20)");
      glow4.addColorStop(1, "transparent");
      ctx.fillStyle = glow4;
      ctx.fillRect(0, 0, W, H);

      /* Diagonal light streaks */
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 80;
      for (let i = -2; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 200, 0);
        ctx.lineTo(i * 200 + 400, H);
        ctx.stroke();
      }
      ctx.restore();

      /* Particle field */
      for (let i = 0; i < 90; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const r = 0.5 + Math.random() * 1.8;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.12 + Math.random() * 0.35})`;
        ctx.fill();
      }

      /* Scattered sparkles */
      const sparklePositions = [
        [120, 150, 6], [880, 180, 7], [200, 500, 5], [800, 520, 6],
        [150, 380, 4], [850, 380, 5], [500, 630, 6], [300, 80, 5],
        [700, 80, 4], [100, 620, 5], [900, 620, 6], [400, 660, 4]
      ];
      const palette = ["#FFD700", "#ff69b4", "#00ffff", "#ffffff", "#ff00ff"];
      for (const [x, y, s] of sparklePositions) {
        const c = palette[Math.floor(Math.random() * palette.length)];
        drawSparkle(ctx, x, y, s, c, 12);
      }

      /* Vignette */
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      /* ═══════ BORDER FRAME ═══════ */
      ctx.save();
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 20;
      const borderGrad = ctx.createLinearGradient(0, 0, W, H);
      borderGrad.addColorStop(0,    "#FFD700");
      borderGrad.addColorStop(0.33, "#ff69b4");
      borderGrad.addColorStop(0.66, "#8a2be2");
      borderGrad.addColorStop(1,    "#FFD700");
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 4;
      roundRect(ctx, 15, 15, W - 30, H - 30, 25);
      ctx.stroke();
      ctx.restore();

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
      ctx.fillStyle = "rgba(255, 215, 0, 0.6)";
      ctx.fillRect(80, 72, 200, 2);
      drawDiamond(ctx, 60, 73, 8, "#FFD700");

      ctx.fillStyle = "rgba(255, 215, 0, 0.6)";
      ctx.fillRect(W - 280, 72, 200, 2);
      drawDiamond(ctx, W - 60, 73, 8, "#FFD700");

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `bold 44px ${SERIF}`;
      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 25;
      ctx.fillText("P R E F I X", W / 2, 92);
      ctx.restore();

      ctx.save();
      ctx.textAlign = "center";
      ctx.font = `italic 16px ${SERIF}`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.fillText("— Command Information —", W / 2, 120);
      ctx.restore();

      /* ═══════ AVATAR ═══════ */
      await drawAvatar(ctx, avatarBuf, W / 2, 255, 92, userName);

      /* ═══════ USER NAME ═══════ */
      const nameSize = fitText(ctx, userName, W - 260, 38, 20, SERIF, "bold");
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      const nameGrad = ctx.createLinearGradient(W / 2, 375, W / 2, 415);
      nameGrad.addColorStop(0,   "#ffffff");
      nameGrad.addColorStop(0.5, "#FFE55C");
      nameGrad.addColorStop(1,   "#FFA500");

      ctx.font = `bold ${nameSize}px ${SERIF}`;
      ctx.fillStyle = nameGrad;
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 22;
      ctx.fillText(userName, W / 2, 412);
      ctx.restore();

      /* Caption */
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = `italic 15px ${SERIF}`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillText("Welcome back!", W / 2, 440);
      ctx.restore();

      /* ═══════ DIVIDER with diamond ═══════ */
      const divY = 468;
      ctx.fillStyle = "rgba(255, 215, 0, 0.4)";
      ctx.fillRect(120, divY, W / 2 - 150, 1);
      ctx.fillRect(W / 2 + 30, divY, W / 2 - 150, 1);
      drawDiamond(ctx, W / 2, divY, 8, "#FFD700");

      /* ═══════ PREFIX BOX ═══════ */
      const boxW = 480;
      const boxH = 108;
      const boxX = W / 2 - boxW / 2;
      const boxY = 496;

      ctx.save();
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 25;
      roundRect(ctx, boxX, boxY, boxW, boxH, 20);
      const boxBg = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
      boxBg.addColorStop(0,   "rgba(255, 215, 0, 0.12)");
      boxBg.addColorStop(0.5, "rgba(255, 20, 147, 0.08)");
      boxBg.addColorStop(1,   "rgba(138, 43, 226, 0.12)");
      ctx.fillStyle = boxBg;
      ctx.fill();
      ctx.restore();

      roundRect(ctx, boxX, boxY, boxW, boxH, 20);
      const boxBorderGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY);
      boxBorderGrad.addColorStop(0,   "rgba(255, 215, 0, 0.7)");
      boxBorderGrad.addColorStop(0.5, "rgba(255, 20, 147, 0.9)");
      boxBorderGrad.addColorStop(1,   "rgba(255, 215, 0, 0.7)");
      ctx.strokeStyle = boxBorderGrad;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      /* Inner accent corners */
      ctx.save();
      ctx.strokeStyle = "rgba(255, 215, 0, 0.55)";
      ctx.lineWidth = 2;
      const ac = 16;
      const corners = [
        [boxX + 10, boxY + 10, 1, 1],
        [boxX + boxW - 10, boxY + 10, -1, 1],
        [boxX + 10, boxY + boxH - 10, 1, -1],
        [boxX + boxW - 10, boxY + boxH - 10, -1, -1]
      ];
      for (const [x, y, dx, dy] of corners) {
        ctx.beginPath();
        ctx.moveTo(x, y + dy * ac);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx * ac, y);
        ctx.stroke();
      }
      ctx.restore();

      /* Label */
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = `bold 14px ${SERIF}`;
      ctx.fillStyle = "rgba(255, 215, 0, 0.85)";
      ctx.fillText("P R E F I X", W / 2, boxY + 30);
      ctx.restore();

      drawDiamond(ctx, W / 2 - 78, boxY + 24, 5, "#FFD700");
      drawDiamond(ctx, W / 2 + 78, boxY + 24, 5, "#FFD700");

      /* Prefix value (auto-fit) */
      const pfxSize = fitText(ctx, prefix, boxW - 80, 58, 26, SERIF, "bold");
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${pfxSize}px ${SERIF}`;
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = 25;
      ctx.fillStyle = "#FFD700";
      ctx.fillText(prefix, W / 2, boxY + 74);
      ctx.restore();

      /* ═══════ FOOTER ═══════ */
      const footY = H - 68;

      ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
      ctx.fillRect(200, footY - 18, W - 400, 1);

      ctx.save();
      ctx.textBaseline = "alphabetic";

      /* Left — Bot */
      ctx.textAlign = "left";
      ctx.font = `13px ${SANS}`;
      ctx.fillStyle = "rgba(255, 215, 0, 0.5)";
      ctx.fillText("BOT", 80, footY + 6);

      ctx.font = `bold 16px ${SERIF}`;
      ctx.fillStyle = "#FFD700";
      ctx.fillText(botName, 80, footY + 28);

      /* Center — Owner */
      ctx.textAlign = "center";
      ctx.font = `13px ${SANS}`;
      ctx.fillStyle = "rgba(255, 215, 0, 0.5)";
      ctx.fillText("OWNER", W / 2, footY + 6);

      ctx.font = `bold 16px ${SERIF}`;
      ctx.fillStyle = "#ff69b4";
      ctx.fillText(botOwner, W / 2, footY + 28);

      /* Right — Commands */
      ctx.textAlign = "right";
      ctx.font = `13px ${SANS}`;
      ctx.fillStyle = "rgba(255, 215, 0, 0.5)";
      ctx.fillText("COMMANDS", W - 80, footY + 6);

      ctx.font = `bold 16px ${SERIF}`;
      ctx.fillStyle = "#00ffff";
      ctx.fillText(`${commandsCount}+`, W - 80, footY + 28);

      ctx.restore();

      /* ═══════ Save + send ═══════ */
      tmpPath = path.join(os.tmpdir(), `prefix_${Date.now()}.png`);
      await fs.writeFile(tmpPath, canvas.toBuffer("image/png"));

      react("✨");

      const stream = fs.createReadStream(tmpPath);
      stream.on("error", () => { /* swallow */ });

      api.sendMessage(
        { body: "", attachment: stream },
        threadID,
        (err) => {
          if (err) console.error("[prefix] send error:", err.message);
          try { fs.unlinkSync(tmpPath); } catch (_) {}
        }
      );

    } catch (e) {
      console.error("[prefix] error:", e && e.message);
      react("❌");
      try { api.sendMessage(`❌ ${String(e.message || e).slice(0, 80)}`, threadID); } catch (_) {}
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    }
  }
};

// © 2026 NEXUS BOT V1