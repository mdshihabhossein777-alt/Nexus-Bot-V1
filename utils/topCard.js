// utils/topCard.js - NEXUS V1 - Premium Top Leaderboard (Dynamic + Fixed)
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const axios = require("axios");

const AVATAR_TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

/* ---------- Load avatar with cache ---------- */
const avatarCache = new Map();
const AVATAR_TTL = 10 * 60 * 1000; // 10 minutes

async function loadAvatar(userID) {
  const key = String(userID);
  const cached = avatarCache.get(key);
  if (cached && Date.now() - cached.time < AVATAR_TTL) {
    return cached.img;
  }

  try {
    const url = `https://graph.facebook.com/${key}/picture?width=256&height=256&access_token=${AVATAR_TOKEN}`;
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const img = await loadImage(Buffer.from(r.data));
    avatarCache.set(key, { img, time: Date.now() });
    return img;
  } catch (_) {
    return null;
  }
}

/* ---------- Format money ---------- */
function formatMoney(n) {
  const num = Number(n) || 0;
  if (num >= 1e18) return `${(num / 1e18).toFixed(2)}Q`;
  if (num >= 1e15) return `${(num / 1e15).toFixed(2)}Qa`;
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return String(num);
}

/* ---------- Truncate ---------- */
function truncate(str, n) {
  const s = String(str || "User");
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/* ---------- Grid background ---------- */
function drawGrid(ctx, W, H) {
  ctx.strokeStyle = "rgba(0, 200, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

/* ---------- Rounded rect helper ---------- */
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

/* ---------- Draw avatar circle ---------- */
function drawAvatar(ctx, img, cx, cy, r, ringColor = "#00d9ff", ringW = 3) {
  /* Outer glow */
  ctx.save();
  ctx.shadowColor = ringColor;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = ringW;
  ctx.stroke();
  ctx.restore();

  /* Inner dark bg */
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a30";
  ctx.fill();

  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  } else {
    /* Fallback — show first letter */
    ctx.fillStyle = ringColor;
    ctx.font = `bold ${r}px Sans`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", cx, cy + 2);
  }
}

/* ---------- Draw crown ---------- */
function drawCrown(ctx, x, y, size, color) {
  ctx.save();
  ctx.font = `bold ${size}px Sans`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillText("👑", x, y);
  ctx.restore();
}

/* ================================================================
   MAIN — Dynamic Height Based on User Count
   ================================================================ */
async function generateTopCard(users) {
  /* ⚡ Keep ALL users — even zero balance */
  if (!users || !users.length) return null;

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);
  const listRows = rest.length;

  const W = 900;
  const headerH = 350;
  const rowH = 62;
  const rowGap = 8;
  const footerH = 80;

  /* Dynamic height */
  const listH = listRows > 0 ? (rowH + rowGap) * listRows + 30 : 0;
  const H = headerH + listH + footerH;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  /* ==================== BACKGROUND ==================== */
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0a0a1a");
  bg.addColorStop(0.4, "#0f0f25");
  bg.addColorStop(1, "#050510");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  drawGrid(ctx, W, H);

  /* Top glow */
  const glowTop = ctx.createRadialGradient(W / 2, 20, 20, W / 2, 20, 500);
  glowTop.addColorStop(0, "rgba(0, 217, 255, 0.20)");
  glowTop.addColorStop(0.5, "rgba(123, 92, 255, 0.10)");
  glowTop.addColorStop(1, "transparent");
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, W, headerH + 100);

  /* ==================== OUTER BORDER ==================== */
  const border = ctx.createLinearGradient(0, 0, W, H);
  border.addColorStop(0, "#00d9ff");
  border.addColorStop(0.5, "#7b5cff");
  border.addColorStop(1, "#ff3d8b");

  ctx.save();
  ctx.shadowColor = "#00d9ff";
  ctx.shadowBlur = 20;
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  roundRect(ctx, 4, 4, W - 8, H - 8, 18);
  ctx.stroke();
  ctx.restore();

  /* ==================== HEADER ==================== */
  ctx.fillStyle = "rgba(0, 217, 255, 0.6)";
  ctx.font = "bold 11px Sans";
  ctx.textAlign = "center";
  ctx.fillText("BIGGEST BALANCE  •  TOP PLAYERS  •  REAL LEGENDS", W / 2, 40);

  /* Title gradient */
  const titleGrad = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
  titleGrad.addColorStop(0, "#00d9ff");
  titleGrad.addColorStop(0.5, "#7b5cff");
  titleGrad.addColorStop(1, "#ff3d8b");

  ctx.save();
  ctx.shadowColor = "rgba(123, 92, 255, 0.6)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = titleGrad;
  ctx.font = "bold 46px Sans";
  ctx.fillText("TOP BALANCE", W / 2, 90);
  ctx.restore();

  ctx.fillStyle = "rgba(255, 61, 139, 0.9)";
  ctx.font = "bold 26px Sans";
  ctx.fillText("LEADERBOARD", W / 2, 122);

  /* ==================== PODIUM — Dynamic ==================== */
  const podiumY = 190;
  const medals = ["#FFD700", "#C0C0C0", "#CD7F32"];

  const podiumPositions = [
    { x: W / 2, y: podiumY, r: 55, ringW: 4, crown: 36 },              // 1st — center
    { x: W / 2 - 200, y: podiumY + 15, r: 45, ringW: 3, crown: 30 },   // 2nd — left
    { x: W / 2 + 200, y: podiumY + 15, r: 45, ringW: 3, crown: 30 }    // 3rd — right
  ];

  /* Adjust for 1-2 users */
  if (top3.length === 2) {
    podiumPositions[1] = { x: W / 2 - 130, y: podiumY + 15, r: 48, ringW: 3, crown: 30 };
    podiumPositions[2] = { x: W / 2 + 130, y: podiumY + 15, r: 48, ringW: 3, crown: 30 };
  }
  if (top3.length === 1) {
    podiumPositions[0] = { x: W / 2, y: podiumY, r: 65, ringW: 4, crown: 42 };
  }

  for (let i = 0; i < top3.length; i++) {
    const u = top3[i];
    const p = podiumPositions[i];

    drawCrown(ctx, p.x, p.y - p.r - 20, p.crown, medals[i]);
    drawAvatar(ctx, u.avatar, p.x, p.y, p.r, medals[i], p.ringW);

    /* Name */
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${i === 0 ? 17 : 15}px Sans`;
    ctx.fillText(truncate(u.name, 12), p.x, p.y + p.r + 25);

    /* Balance */
    ctx.fillStyle = medals[i];
    ctx.font = `bold ${i === 0 ? 15 : 13}px Sans`;
    ctx.fillText(`$${formatMoney(u.total)}`, p.x, p.y + p.r + 47);

    /* Rank label */
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "bold 10px Sans";
    ctx.fillText(`RANK #${i + 1}`, p.x, p.y + p.r + 62);
  }

  /* ==================== COLUMN HEADERS ==================== */
  if (listRows > 0) {
    const colHeaderY = headerH + 5;

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "bold 11px Sans";
    ctx.fillText("RANKING", 40, colHeaderY);

    ctx.textAlign = "right";
    ctx.fillText("BALANCE", W - 40, colHeaderY);

    /* Divider */
    ctx.strokeStyle = "rgba(0, 217, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, colHeaderY + 10);
    ctx.lineTo(W - 40, colHeaderY + 10);
    ctx.stroke();
  }

  /* ==================== LIST ROWS (rank 4+) ==================== */
  const startY = headerH + 30;
  const maxBalance = users[0]?.total || 1;

  for (let i = 0; i < rest.length; i++) {
    const u = rest[i];
    const rank = i + 4;
    const y = startY + i * (rowH + rowGap);

    /* Row background — glassmorphism */
    const rowBg = ctx.createLinearGradient(40, y, W - 40, y);
    rowBg.addColorStop(0, "rgba(0, 217, 255, 0.06)");
    rowBg.addColorStop(0.5, "rgba(123, 92, 255, 0.04)");
    rowBg.addColorStop(1, "rgba(255, 61, 139, 0.06)");

    ctx.fillStyle = rowBg;
    roundRect(ctx, 40, y, W - 80, rowH, 12);
    ctx.fill();

    /* Row border */
    ctx.strokeStyle = "rgba(0, 217, 255, 0.15)";
    ctx.lineWidth = 1;
    roundRect(ctx, 40, y, W - 80, rowH, 12);
    ctx.stroke();

    /* ---- Rank badge ---- */
    const badgeX = 70;
    const badgeY = y + rowH / 2;

    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 18, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 217, 255, 0.15)";
    ctx.fill();
    ctx.strokeStyle = "#00d9ff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px Sans";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(rank), badgeX, badgeY + 1);

    /* ---- Avatar ---- */
    const avX = badgeX + 55;
    const avY = badgeY;
    drawAvatar(ctx, u.avatar, avX, avY, 22, "#00d9ff", 2);

    /* ---- Name ---- */
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px Sans";
    ctx.fillText(truncate(u.name, 20), avX + 35, y + 26);

    /* Subtitle */
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "10px Sans";
    ctx.fillText("PLAYER", avX + 35, y + 42);

    /* ---- Balance ---- */
    ctx.textAlign = "right";
    ctx.fillStyle = "#00ff88";
    ctx.font = "bold 15px Sans";
    ctx.fillText(`$${formatMoney(u.total)}`, W - 55, y + 26);

    ctx.fillStyle = "rgba(0, 255, 136, 0.5)";
    ctx.font = "10px Sans";
    ctx.fillText("TOTAL", W - 55, y + 42);

    /* ---- Progress bar ---- */
    const pbX = avX + 35;
    const pbY = y + rowH - 10;
    const pbW = W - pbX - 100;
    const pbH = 3;

    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    roundRect(ctx, pbX, pbY, pbW, pbH, 2);
    ctx.fill();

    const pct = Math.min(1, u.total / maxBalance);
    const fillW = Math.max(4, pbW * pct);

    const pbGrad = ctx.createLinearGradient(pbX, 0, pbX + pbW, 0);
    pbGrad.addColorStop(0, "#00d9ff");
    pbGrad.addColorStop(0.5, "#7b5cff");
    pbGrad.addColorStop(1, "#ff3d8b");

    ctx.save();
    ctx.shadowColor = "#00d9ff";
    ctx.shadowBlur = 6;
    ctx.fillStyle = pbGrad;
    roundRect(ctx, pbX, pbY, fillW, pbH, 2);
    ctx.fill();
    ctx.restore();
  }

  /* ==================== FOOTER ==================== */
  const footerY = H - 40;

  ctx.strokeStyle = "rgba(0, 217, 255, 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, footerY - 15);
  ctx.lineTo(W - 40, footerY - 15);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const footGrad = ctx.createLinearGradient(W / 2 - 120, 0, W / 2 + 120, 0);
  footGrad.addColorStop(0, "#00d9ff");
  footGrad.addColorStop(0.5, "#7b5cff");
  footGrad.addColorStop(1, "#ff3d8b");

  ctx.fillStyle = footGrad;
  ctx.font = "bold 13px Sans";
  ctx.fillText("⚡ Powered by Shihab", W / 2, footerY + 5);

  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.font = "10px Sans";
  ctx.fillText(`NEXUS BOT V1  •  ${users.length} PLAYERS`, W / 2, footerY + 22);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  return canvas.encode("png");
}

module.exports = { generateTopCard, loadAvatar };
// Powered by Shihab