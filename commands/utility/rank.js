// commands/utility/rank.js - NEXUS V1 - Premium Infinity Rank Card
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const axios = require("axios");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
fs.ensureDirSync(DATA_DIR);
const RANK_FILE = path.join(DATA_DIR, "rank.json");

const AVATAR_TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

/* ================================================================
   TIERS
   ================================================================ */
const TIERS = [
  {
    min: 100, name: "INFINITY  ∞  LEGEND", emoji: "🌈",
    c1: "#ff00ff", c2: "#00ffff", c3: "#FFD700",
    rainbow: true, tagline: "Beyond Limit",
    bg: ["rgba(50, 10, 70, 1)", "rgba(20, 0, 40, 1)"]
  },
  {
    min: 51, name: "VIP GOLD  👑", emoji: "👑",
    c1: "#FFD700", c2: "#FFA500", c3: "#FF8C00",
    tagline: "Elite Member",
    bg: ["rgba(45, 35, 8, 1)", "rgba(20, 12, 0, 1)"]
  },
  {
    min: 26, name: "EPIC  🔥", emoji: "🔥",
    c1: "#ffea00", c2: "#ff6a00", c3: "#ff3300",
    tagline: "On Fire!",
    bg: ["rgba(45, 18, 5, 1)", "rgba(20, 8, 0, 1)"]
  },
  {
    min: 11, name: "RARE  💎", emoji: "💎",
    c1: "#00d9ff", c2: "#7b5cff", c3: "#0096c7",
    tagline: "Rare Achiever",
    bg: ["rgba(8, 28, 45, 1)", "rgba(0, 12, 25, 1)"]
  },
  {
    min: 1, name: "NORMAL", emoji: "⭐",
    c1: "#a8b8d0", c2: "#7b8fa8", c3: "#d0dae8",
    tagline: "Keep Going!",
    bg: ["rgba(22, 28, 45, 1)", "rgba(10, 12, 20, 1)"]
  }
];

function getTier(level) {
  for (const t of TIERS) if (level >= t.min) return t;
  return TIERS[TIERS.length - 1];
}

/* ================================================================
   DATA
   ================================================================ */
function loadRankData() {
  try { return fs.readJsonSync(RANK_FILE) || {}; } catch (_) { return {}; }
}
function saveRankData(d) {
  try { fs.writeJsonSync(RANK_FILE, d); } catch (e) { console.error("[rank]", e.message); }
}

/* ================================================================
   LOAD AVATAR
   ================================================================ */
async function loadAvatar(userID) {
  try {
    const url = `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=${AVATAR_TOKEN}`;
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    return await loadImage(Buffer.from(r.data));
  } catch (_) { return null; }
}

/* ================================================================
   DRAW HELPERS
   ================================================================ */
function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
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

function makeRainbowGrad(ctx, x1, y1, x2, y2, alpha = 1) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0,    `rgba(255, 0, 255, ${alpha})`);
  g.addColorStop(0.2,  `rgba(0, 200, 255, ${alpha})`);
  g.addColorStop(0.4,  `rgba(0, 255, 136, ${alpha})`);
  g.addColorStop(0.6,  `rgba(255, 234, 0, ${alpha})`);
  g.addColorStop(0.8,  `rgba(255, 106, 0, ${alpha})`);
  g.addColorStop(1,    `rgba(255, 0, 128, ${alpha})`);
  return g;
}

function makeTierGrad(ctx, x1, y1, x2, y2, tier) {
  if (tier.rainbow) return makeRainbowGrad(ctx, x1, y1, x2, y2);
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, tier.c1);
  g.addColorStop(0.5, tier.c2);
  g.addColorStop(1, tier.c3);
  return g;
}

/* ---- Premium Sparkle (4-point star with rays) ---- */
function drawSparkle(ctx, x, y, size, color = "#ffffff", blur = 15) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;

  /* 4-point star */
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.15, y - size * 0.15, x + size, y);
  ctx.quadraticCurveTo(x + size * 0.15, y + size * 0.15, x, y + size);
  ctx.quadraticCurveTo(x - size * 0.15, y + size * 0.15, x - size, y);
  ctx.quadraticCurveTo(x - size * 0.15, y - size * 0.15, x, y - size);
  ctx.closePath();
  ctx.fill();

  /* Long rays */
  ctx.lineWidth = size * 0.15;
  ctx.strokeStyle = color;
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i;
    const x1 = x + Math.cos(angle) * size * 1.4;
    const y1 = y + Math.sin(angle) * size * 1.4;
    const x2 = x + Math.cos(angle) * size * 2.2;
    const y2 = y + Math.sin(angle) * size * 2.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /* Center dot */
  ctx.beginPath();
  ctx.arc(x, y, size * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.restore();
}

/* ---- Premium Diamond with facets ---- */
function drawDiamondGem(ctx, x, y, size, color, opacity = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = opacity;

  /* Outer glow */
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;

  /* Diamond shape (top point, sides, bottom) */
  const h = size * 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(size, 0);
  ctx.lineTo(0, h);
  ctx.lineTo(-size, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  /* Highlight facet (top-left) */
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(size * 0.5, -h * 0.3);
  ctx.lineTo(0, 0);
  ctx.lineTo(-size * 0.5, -h * 0.3);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.shadowBlur = 0;
  ctx.fill();

  /* Center sparkle */
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.restore();
}

/* ---- Premium Gem Cluster (multiple gems together) ---- */
function drawGemCluster(ctx, x, y, size, direction) {
  /* Direction: 0=TL, 1=TR, 2=BL, 3=BR */
  const gems = [
    { ox: 0, oy: 0, size: size, color: "#ff66cc", rot: 0 },
    { ox: size * 1.5, oy: 0, size: size * 0.75, color: "#66ccff", rot: 0.3 },
    { ox: 0, oy: size * 1.5, size: size * 0.7, color: "#ffdd66", rot: -0.3 },
    { ox: size * 1.3, oy: size * 1.3, size: size * 0.9, color: "#cc66ff", rot: 0.15 },
    { ox: size * 0.75, oy: size * 0.75, size: size * 0.55, color: "#ffffff", rot: 0 }
  ];

  for (const g of gems) {
    let gx = x + (direction >= 2 ? -g.ox : g.ox) * (direction === 1 || direction === 3 ? -1 : 1);
    let gy = y + (direction >= 2 ? -g.oy : g.oy);
    drawDiamondGem(ctx, gx, gy, g.size, g.color, 0.95);
  }
}

/* ---- Large Gem (for border middle) ---- */
function drawBorderGem(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);

  /* Outer glow */
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;

  /* Diamond */
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.7, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.7, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  /* Inner white */
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.5);
  ctx.lineTo(size * 0.35, 0);
  ctx.lineTo(0, size * 0.5);
  ctx.lineTo(-size * 0.35, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.shadowBlur = 0;
  ctx.fill();

  /* Center sparkle */
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.restore();
}

/* ---- Crystal Border (gem-studded) ---- */
function drawCrystalBorder(ctx, W, H, tier) {
  /* Main rainbow border */
  ctx.save();
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 25;
  const borderGrad = makeTierGrad(ctx, 0, 0, W, H, tier);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 6;
  roundRect(ctx, 14, 14, W - 28, H - 28, 24);
  ctx.stroke();
  ctx.restore();

  /* Inner thin white */
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 26, 26, W - 52, H - 52, 20);
  ctx.stroke();

  /* Gem clusters at 4 corners */
  const gemSize = 9;
  drawGemCluster(ctx, 45, 45, gemSize, 0);                      /* TL */
  drawGemCluster(ctx, W - 45, 45, gemSize, 1);                  /* TR */
  drawGemCluster(ctx, 45, H - 45, gemSize, 2);                  /* BL */
  drawGemCluster(ctx, W - 45, H - 45, gemSize, 3);              /* BR */

  /* Border gems (equally spaced along edges) */
  const gemColors = ["#ff66cc", "#66ccff", "#ffdd66", "#cc66ff", "#66ffcc", "#ff9966"];

  /* Top edge gems */
  const topGems = 8;
  for (let i = 1; i < topGems; i++) {
    const x = (W / topGems) * i;
    const color = gemColors[i % gemColors.length];
    drawBorderGem(ctx, x, 22, 6, color);
  }

  /* Bottom edge gems */
  for (let i = 1; i < topGems; i++) {
    const x = (W / topGems) * i;
    const color = gemColors[(i + 2) % gemColors.length];
    drawBorderGem(ctx, x, H - 22, 6, color);
  }

  /* Left edge gems */
  const sideGems = 4;
  for (let i = 1; i < sideGems; i++) {
    const y = (H / sideGems) * i;
    const color = gemColors[(i + 3) % gemColors.length];
    drawBorderGem(ctx, 22, y, 6, color);
  }

  /* Right edge gems */
  for (let i = 1; i < sideGems; i++) {
    const y = (H / sideGems) * i;
    const color = gemColors[(i + 4) % gemColors.length];
    drawBorderGem(ctx, W - 22, y, 6, color);
  }
}

/* ---- Sparkle Field (many premium sparkles everywhere) ---- */
function drawSparkleField(ctx, W, H, tier) {
  const isRainbow = tier.rainbow;
  const colors = isRainbow
    ? ["#ffffff", "#ffd700", "#ff66cc", "#66ccff", "#ffdd66", "#cc66ff"]
    : ["#ffffff", tier.c1, tier.c2, "#ffd700"];

  /* Large sparkles scattered */
  const largeSparkles = [
    { x: 130, y: 100, s: 8 }, { x: 350, y: 55, s: 6 },
    { x: 600, y: 90, s: 9 }, { x: 850, y: 60, s: 7 },
    { x: 1080, y: 95, s: 8 }, { x: 1310, y: 70, s: 10 },
    { x: 80, y: 220, s: 7 }, { x: 1360, y: 230, s: 8 },
    { x: 95, y: 400, s: 6 }, { x: 1350, y: 380, s: 9 },
    { x: 200, y: H - 120, s: 8 }, { x: 480, y: H - 90, s: 7 },
    { x: 850, y: H - 110, s: 9 }, { x: 1180, y: H - 85, s: 8 },
    { x: 700, y: 200, s: 7 }, { x: 800, y: 480, s: 6 },
    { x: 400, y: 400, s: 6 }, { x: 1000, y: 400, s: 7 }
  ];

  for (let i = 0; i < largeSparkles.length; i++) {
    const s = largeSparkles[i];
    const color = colors[i % colors.length];
    drawSparkle(ctx, s.x, s.y, s.s, color, 15);
  }

  /* Small filler sparkles */
  for (let i = 0; i < 60; i++) {
    const x = 30 + Math.random() * (W - 60);
    const y = 30 + Math.random() * (H - 60);
    const size = 1 + Math.random() * 3;
    const color = colors[Math.floor(Math.random() * colors.length)];
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ---- Crown above avatar ---- */
function drawCrown(ctx, x, y, size, color = "#FFD700") {
  ctx.save();
  ctx.font = `bold ${size}px Sans`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 30;
  ctx.fillStyle = "#FFD700";
  ctx.fillText("👑", x, y);
  ctx.restore();
}

/* ================================================================
   MAIN — Generate Card
   ================================================================ */
async function generateRankCard(opts) {
  const {
    userName = "User",
    userAvatar = null,
    level = 1,
    exp = 0,
    expNeeded = 10000,
    msgs = 0
  } = opts;

  const tier = getTier(level);
  const isMax = level >= 100;
  const isRainbow = tier.rainbow;

  const W = 1440, H = 600;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  /* ==================== BACKGROUND ==================== */
  /* Deep black with tier-colored radial glow */
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);

  const bgGlow = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7);
  bgGlow.addColorStop(0, tier.bg[0]);
  bgGlow.addColorStop(0.5, tier.bg[1]);
  bgGlow.addColorStop(1, "rgba(0, 0, 0, 1)");
  ctx.fillStyle = bgGlow;
  ctx.fillRect(0, 0, W, H);

  /* Subtle grid */
  ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  /* ==================== SPARKLE FIELD (behind content) ==================== */
  drawSparkleField(ctx, W, H, tier);

  /* ==================== CRYSTAL BORDER ==================== */
  drawCrystalBorder(ctx, W, H, tier);

  /* ==================== TIER BADGE (Top Right) ==================== */
  const badgeX = W - 480;
  const badgeY = 40;
  const badgeW = 440;
  const badgeH = 60;

  /* Badge background */
  ctx.save();
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 25;
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 16);
  ctx.fill();
  ctx.restore();

  /* Badge border */
  const badgeBorderGrad = makeTierGrad(ctx, badgeX, badgeY, badgeX + badgeW, badgeY, tier);
  ctx.strokeStyle = badgeBorderGrad;
  ctx.lineWidth = 3;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 16);
  ctx.stroke();

  /* Badge gems on sides */
  drawBorderGem(ctx, badgeX - 12, badgeY + badgeH / 2, 8, tier.c1);
  drawBorderGem(ctx, badgeX + badgeW + 12, badgeY + badgeH / 2, 8, tier.c2);

  /* Badge text */
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 28px Georgia, serif";
  ctx.fillStyle = isRainbow
    ? makeRainbowGrad(ctx, badgeX, 0, badgeX + badgeW, 0)
    : tier.c1;
  ctx.fillText(tier.name, badgeX + badgeW / 2, badgeY + badgeH / 2 + 2);

  /* ==================== AVATAR ==================== */
  const avX = 220;
  const avY = 300;
  const avR = 130;

  /* Rainbow glow behind */
  const avGlow = ctx.createRadialGradient(avX, avY, avR * 0.5, avX, avY, avR * 2.4);
  avGlow.addColorStop(0, `${tier.c1}60`);
  avGlow.addColorStop(0.5, `${tier.c2}30`);
  avGlow.addColorStop(1, "transparent");
  ctx.fillStyle = avGlow;
  ctx.fillRect(avX - avR * 2.5, avY - avR * 2.5, avR * 5, avR * 5);

  /* Outer glow ring */
  ctx.save();
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 35;
  const avatarRing = makeTierGrad(ctx, avX - avR, avY - avR, avX + avR, avY + avR, tier);
  ctx.strokeStyle = avatarRing;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(avX, avY, avR + 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  /* Inner golden ring */
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.stroke();

  /* Draw avatar */
  if (userAvatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(avX, avY, avR - 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const ratio = userAvatar.width / userAvatar.height;
    let dw = avR * 2, dh = avR * 2;
    if (ratio > 1) { dh = avR * 2; dw = dh * ratio; }
    else { dw = avR * 2; dh = dw / ratio; }
    ctx.drawImage(userAvatar, avX - dw / 2, avY - dh / 2, dw, dh);
    ctx.restore();
  } else {
    ctx.fillStyle = "#1a1a30";
    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Crown above avatar */
  drawCrown(ctx, avX, avY - avR - 45, 75);

  /* Sparkles around avatar */
  drawSparkle(ctx, avX - avR - 20, avY - 30, 6, tier.c1);
  drawSparkle(ctx, avX + avR + 20, avY - 30, 6, tier.c2);
  drawSparkle(ctx, avX - avR - 10, avY + 50, 5, tier.c3);
  drawSparkle(ctx, avX + avR + 15, avY + 50, 7, "#ffffff");

  /* ==================== NAME (Under Avatar) ==================== */
  const nameY = avY + avR + 75;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 44px Georgia, serif";

  /* Glow */
  ctx.save();
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 25;
  ctx.fillStyle = tier.c1;
  ctx.fillText(userName.slice(0, 20), avX, nameY);
  ctx.restore();

  /* White text on top */
  ctx.fillStyle = "#ffffff";
  ctx.fillText(userName.slice(0, 20), avX, nameY);

  /* ==================== 3 INFO COLUMNS ==================== */
  const infoX = 500;
  const infoY = 230;

  /* --- Column 1: LEVEL --- */
  ctx.textAlign = "center";
  ctx.font = "bold 24px Sans";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Level", infoX + 130, infoY);

  ctx.font = "bold 38px Sans";
  ctx.fillText("👑", infoX + 55, infoY + 72);

  const levelText = isMax ? "999999" : String(level);
  ctx.font = "bold 56px Sans";
  ctx.fillStyle = isRainbow
    ? makeRainbowGrad(ctx, infoX, 0, infoX + 260, 0)
    : tier.c1;
  ctx.fillText(levelText, infoX + 165, infoY + 78);

  /* Divider */
  ctx.strokeStyle = `${tier.c1}40`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(infoX + 310, infoY - 20);
  ctx.lineTo(infoX + 310, infoY + 130);
  ctx.stroke();

  /* --- Column 2: EXP --- */
  ctx.font = "bold 24px Sans";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Exp", infoX + 445, infoY);

  ctx.font = "bold 38px Sans";
  ctx.fillStyle = isRainbow ? "#ffffff" : tier.c1;
  ctx.fillText("∞", infoX + 350, infoY + 72);

  const expText = isMax
    ? "∞ / ∞"
    : `${exp.toLocaleString()} / ${expNeeded.toLocaleString()}`;
  ctx.font = "bold 44px Sans";
  ctx.fillStyle = isRainbow
    ? makeRainbowGrad(ctx, infoX + 390, 0, infoX + 600, 0)
    : "#ffffff";
  ctx.fillText(expText, infoX + 495, infoY + 78);

  /* Divider 2 */
  ctx.strokeStyle = `${tier.c1}40`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(infoX + 645, infoY - 20);
  ctx.lineTo(infoX + 645, infoY + 130);
  ctx.stroke();

  /* --- Column 3: MESSAGES --- */
  ctx.font = "bold 24px Sans";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Messages", infoX + 800, infoY);

  ctx.font = "bold 38px Sans";
  ctx.fillStyle = tier.c1;
  ctx.fillText("💬", infoX + 715, infoY + 72);

  ctx.font = "bold 52px Sans";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(msgs).slice(0, 9), infoX + 850, infoY + 78);

  /* ==================== PROGRESS BAR ==================== */
  const pbX = 130;
  const pbY = 480;
  const pbW = W - 260;
  const pbH = 46;

  /* Outer glow */
  ctx.save();
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 20;
  ctx.fillStyle = "rgba(15, 8, 25, 0.9)";
  roundRect(ctx, pbX, pbY, pbW, pbH, pbH / 2);
  ctx.fill();
  ctx.restore();

  /* Border */
  ctx.strokeStyle = makeTierGrad(ctx, pbX, pbY, pbX + pbW, pbY, tier);
  ctx.lineWidth = 3;
  roundRect(ctx, pbX, pbY, pbW, pbH, pbH / 2);
  ctx.stroke();

  /* Progress fill */
  const pct = isMax ? 1 : Math.min(1, exp / expNeeded);
  const fillW = pct * (pbW - 8);

  if (fillW > 4) {
    const fillGrad = makeTierGrad(ctx, pbX, pbY, pbX + pbW, pbY, tier);

    ctx.save();
    ctx.shadowColor = tier.c1;
    ctx.shadowBlur = 25;
    ctx.fillStyle = fillGrad;
    roundRect(ctx, pbX + 4, pbY + 4, fillW, pbH - 8, (pbH - 8) / 2);
    ctx.fill();
    ctx.restore();

    /* Sparkles inside progress */
    if (fillW > 100) {
      const sparkCount = Math.min(6, Math.floor(fillW / 150));
      for (let i = 0; i < sparkCount; i++) {
        const sx = pbX + 30 + (fillW - 60) * (i / Math.max(1, sparkCount - 1));
        const sy = pbY + pbH / 2;
        drawSparkle(ctx, sx, sy, 5 + (i % 3), "#ffffff", 10);
      }
    }
  }

  /* Progress text */
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "bold 20px Sans";
  ctx.fillStyle = "#ffffff";
  const progressText = isMax ? "PROGRESS:  ∞" : `PROGRESS:  ${Math.floor(pct * 100)}%`;
  ctx.fillText(progressText, pbX + 30, pbY + pbH / 2 + 2);

  /* ==================== FOOTER TEXT ==================== */
  const footY = H - 55;
  ctx.textAlign = "center";
  ctx.font = isMax ? "bold 28px Georgia, serif" : "bold 22px Georgia, serif";

  ctx.save();
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 25;
  ctx.fillStyle = isRainbow
    ? makeRainbowGrad(ctx, W / 2 - 380, 0, W / 2 + 380, 0)
    : tier.c1;

  const footText = isMax
    ? "∞  INFINITY LEVEL: Beyond Limit  ∞"
    : `${tier.emoji}  ${tier.name}  •  ${tier.tagline}  ${tier.emoji}`;
  ctx.fillText(footText, W / 2, footY);
  ctx.restore();

  /* Powered by Shihab */
  ctx.textAlign = "right";
  ctx.font = "italic 14px Georgia, serif";
  ctx.fillStyle = `${tier.c1}cc`;
  ctx.shadowBlur = 0;
  ctx.fillText("Powered by Shihab", W - 55, H - 22);

  return canvas.encode("png");
}

/* ================================================================
   MAIN MODULE
   ================================================================ */
module.exports = {
  name: "rank",
  aliases: ["myrank", "rankcard", "card"],
  version: "7.0.0",
  role: 0,
  description: "Show your premium rank card",
  usage: "/rank [@user]",

  execute: async function (api, event, args, db) {
    const { threadID, senderID, mentions, messageReply } = event;
    let tmpPath = null;

    try {
      let target = String(senderID);
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);

      const data = loadRankData();
      if (!data[threadID]) data[threadID] = {};
      if (!data[threadID][target]) data[threadID][target] = { exp: 0, level: 1, msgs: 0 };

      const user = data[threadID][target];

      if (target === String(senderID)) {
        user.msgs = (user.msgs || 0) + 1;
        user.exp  = (user.exp  || 0) + 15;
        if (user.exp >= user.level * 10000) {
          user.level += 1;
          user.exp = 0;
        }
        saveRankData(data);
      }

      let name = "User";
      try {
        const info = await api.getUserInfo(target);
        if (info && info[target] && info[target].name) name = info[target].name;
      } catch (_) {}

      const avatar = await loadAvatar(target);

      const buf = await generateRankCard({
        userName: name,
        userAvatar: avatar,
        level: user.level,
        exp: user.exp,
        expNeeded: user.level * 10000,
        msgs: user.msgs || 0
      });

      tmpPath = path.join(os.tmpdir(), `nexus_rank_${target}_${Date.now()}.png`);
      await fs.writeFile(tmpPath, buf);

      api.sendMessage({
        body: "",
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[rank] error:", e.message);
      api.sendMessage("❌ Rank card failed: " + e.message, threadID);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    }
  }
};
// Powered by Shihab