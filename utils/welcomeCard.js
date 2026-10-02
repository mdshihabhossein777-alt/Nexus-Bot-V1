// utils/welcomeCard.js - NEXUS V1 - FAST Welcome Card
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const axios = require("axios");
const path = require("path");
const fs = require("fs-extra");

const AVATAR_TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";
const BG_CACHE = path.join(__dirname, "..", "data", "welcome-bg.png");

/* ================================================================
   ⚡ AVATAR CACHE (in-memory)
   ================================================================ */
const avatarCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function loadAvatar(userID) {
  const key = String(userID);
  const cached = avatarCache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.img;
  }

  try {
    const url = `https://graph.facebook.com/${key}/picture?width=256&height=256&access_token=${AVATAR_TOKEN}`;
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 8000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const img = await loadImage(Buffer.from(r.data));
    avatarCache.set(key, { img, time: Date.now() });
    return img;
  } catch (_) { return null; }
}

async function loadGroupLogo(threadID) {
  return loadAvatar(threadID); // same cache
}

/* ================================================================
   ⚡ FAST BACKGROUND (pre-generated on startup)
   ================================================================ */
async function getBackground() {
  try {
    if (fs.existsSync(BG_CACHE)) {
      return await loadImage(BG_CACHE);
    }
  } catch (_) {}
  return null; // fallback if not ready
}

/* ================================================================
   🔥 PRELOAD (call this at bot startup)
   ================================================================ */
async function preloadBackground() {
  if (fs.existsSync(BG_CACHE)) {
    console.log("[welcome-bg] already cached ✓");
    return true;
  }

  try {
    console.log("[welcome-bg] generating (one-time, 20-60s)...");
    const prompt = encodeURIComponent(
      "beautiful anime scenery wallpaper, cherry blossom tree left, purple pink sunset sky, " +
      "Tokyo city skyline, japanese street lamps glowing, sakura petals floating, " +
      "makoto shinkai style, cinematic, vibrant colors, 8k ultra detailed, " +
      "no people, no text"
    );
    const url = `https://image.pollinations.ai/prompt/${prompt}?model=flux&width=1280&height=720&nologo=true&seed=7`;
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 90000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    fs.ensureDirSync(path.dirname(BG_CACHE));
    fs.writeFileSync(BG_CACHE, Buffer.from(r.data));
    console.log("[welcome-bg] cached ✓");
    return true;
  } catch (e) {
    console.warn("[welcome-bg] failed:", e.message);
    return false;
  }
}

function truncate(str, n) {
  const s = String(str || "User");
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/* ---------- Avatar circle ---------- */
function drawCircleAvatar(ctx, img, cx, cy, r, ringColor, ringW = 3, glow = 15) {
  ctx.save();
  ctx.shadowColor = ringColor;
  ctx.shadowBlur = glow;
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = ringW;
  ctx.beginPath();
  ctx.arc(cx, cy, r + ringW / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  if (!img) {
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const ratio = img.width / img.height;
  let dw = r * 2, dh = r * 2;
  if (ratio > 1) { dh = r * 2; dw = dh * ratio; }
  else { dw = r * 2; dh = dw / ratio; }
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

/* ---------- Fallback background (instant) ---------- */
function drawFallbackBackground(ctx, W, H) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#2a1a4a");
  bg.addColorStop(0.5, "#5c2d6f");
  bg.addColorStop(1, "#ff9ed4");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const g1 = ctx.createRadialGradient(W * 0.15, H * 0.6, 20, W * 0.15, H * 0.6, 500);
  g1.addColorStop(0, "rgba(255, 100, 180, 0.5)");
  g1.addColorStop(1, "transparent");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W * 0.85, H * 0.5, 20, W * 0.85, H * 0.5, 500);
  g2.addColorStop(0, "rgba(100, 150, 255, 0.4)");
  g2.addColorStop(1, "transparent");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  /* City silhouette */
  ctx.fillStyle = "rgba(15, 8, 30, 0.7)";
  const buildings = [
    { x: 0, w: 80, h: 130 }, { x: 90, w: 60, h: 90 },
    { x: 160, w: 100, h: 160 }, { x: 270, w: 70, h: 110 },
    { x: 350, w: 90, h: 140 }, { x: 450, w: 80, h: 100 },
    { x: 540, w: 120, h: 180 }, { x: 670, w: 70, h: 130 },
    { x: 750, w: 100, h: 150 }, { x: 860, w: 90, h: 120 },
    { x: 960, w: 110, h: 170 }, { x: 1080, w: 90, h: 140 },
    { x: 1180, w: 100, h: 160 }
  ];
  for (const b of buildings) ctx.fillRect(b.x, H - b.h - 60, b.w, b.h + 60);

  /* Street lamps */
  for (const lx of [W * 0.28, W * 0.7]) {
    ctx.fillStyle = "rgba(20, 15, 35, 0.9)";
    ctx.fillRect(lx - 2, H * 0.55, 4, H * 0.45);
    const lg = ctx.createRadialGradient(lx, H * 0.5, 5, lx, H * 0.5, 80);
    lg.addColorStop(0, "rgba(255, 150, 200, 0.9)");
    lg.addColorStop(1, "transparent");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(lx, H * 0.5, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 200, 220, 1)";
    ctx.beginPath();
    ctx.arc(lx, H * 0.5, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ================================================================
   MAIN — Generate (FAST)
   ================================================================ */
async function generateWelcomeCard(opts) {
  const {
    addedName = "New Member",
    addedAvatar = null,
    adderName = "Admin",
    adderAvatar = null,
    groupName = "the group",
    groupLogo = null,
    memberCount = 0,
    adminCount = 0,
    maleCount = 0,
    femaleCount = 0
  } = opts;

  const W = 1280, H = 720;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  /* Background */
  const bg = await getBackground();
  if (bg) {
    ctx.drawImage(bg, 0, 0, W, H);
  } else {
    drawFallbackBackground(ctx, W, H);
  }

  /* Top bar */
  const topGrad = ctx.createLinearGradient(0, 0, 0, 160);
  topGrad.addColorStop(0, "rgba(8, 4, 20, 0.97)");
  topGrad.addColorStop(0.65, "rgba(8, 4, 20, 0.88)");
  topGrad.addColorStop(1, "rgba(8, 4, 20, 0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 160);

  /* Group logo + name */
  drawCircleAvatar(ctx, groupLogo, 65, 55, 42, "#00d9ff", 3, 18);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.save();
  ctx.shadowColor = "rgba(0, 217, 255, 0.7)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px Sans";
  ctx.fillText(truncate(groupName, 28).toUpperCase(), 130, 45);
  ctx.restore();

  ctx.fillStyle = "rgba(210, 225, 255, 0.9)";
  ctx.font = "bold 17px Sans";
  ctx.fillText(`${memberCount} members`, 130, 78);

  ctx.fillStyle = "rgba(255, 150, 200, 0.9)";
  ctx.fillText(`${adminCount} admins`, 280, 78);

  /* Right — Invited by */
  const adX = W - 30 - 36;
  drawCircleAvatar(ctx, adderAvatar, adX, 55, 36, "#ff3d8b", 3, 15);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = "bold 16px Sans";
  ctx.fillText("Invited by:", adX - 56, 42);

  ctx.save();
  ctx.shadowColor = "rgba(255, 100, 200, 0.7)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#ff9ed4";
  ctx.font = "bold 20px Sans";
  ctx.fillText(truncate(adderName, 22), adX - 56, 72);
  ctx.restore();

  /* WELCOME */
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.save();
  ctx.shadowColor = "rgba(200, 255, 100, 0.95)";
  ctx.shadowBlur = 40;
  ctx.fillStyle = "rgba(180, 240, 100, 0.6)";
  ctx.font = "bold 92px Georgia, serif";
  ctx.fillText("WELCOME", W / 2, 175);
  ctx.restore();

  ctx.fillStyle = "rgba(245, 255, 230, 1)";
  ctx.font = "bold 92px Georgia, serif";
  ctx.fillText("WELCOME", W / 2, 175);

  /* Main avatar */
  const avX = W / 2, avY = 400, mainAvR = 130;

  /* Green glow */
  const glowGrad = ctx.createRadialGradient(avX, avY, mainAvR * 0.5, avX, avY, mainAvR * 2);
  glowGrad.addColorStop(0, "rgba(150, 255, 100, 0.45)");
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(avX - mainAvR * 2.5, avY - mainAvR * 2.5, mainAvR * 5, mainAvR * 5);

  ctx.save();
  ctx.shadowColor = "#aaff55";
  ctx.shadowBlur = 30;
  ctx.strokeStyle = "#aaff55";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(avX, avY, mainAvR + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(avX, avY, mainAvR + 1, 0, Math.PI * 2);
  ctx.stroke();

  if (addedAvatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(avX, avY, mainAvR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const ratio = addedAvatar.width / addedAvatar.height;
    let dw = mainAvR * 2, dh = mainAvR * 2;
    if (ratio > 1) { dh = mainAvR * 2; dw = dh * ratio; }
    else { dw = mainAvR * 2; dh = dw / ratio; }
    ctx.drawImage(addedAvatar, avX - dw / 2, avY - dh / 2, dw, dh);
    ctx.restore();
  }

  /* Name */
  const nameY = avY + mainAvR + 70;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(200, 255, 100, 0.95)";
  ctx.shadowBlur = 30;
  ctx.fillStyle = "rgba(200, 245, 130, 0.8)";
  ctx.font = "bold 62px Georgia, serif";
  ctx.fillText(truncate(addedName, 20), W / 2, nameY);
  ctx.restore();

  ctx.fillStyle = "rgba(240, 255, 215, 1)";
  ctx.font = "bold 62px Georgia, serif";
  ctx.fillText(truncate(addedName, 20), W / 2, nameY);

  /* Bottom bar */
  const botGrad = ctx.createLinearGradient(0, H - 130, 0, H);
  botGrad.addColorStop(0, "rgba(8, 4, 20, 0)");
  botGrad.addColorStop(0.5, "rgba(8, 4, 20, 0.85)");
  botGrad.addColorStop(1, "rgba(8, 4, 20, 0.97)");
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H - 130, W, 130);

  const statY = H - 40;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "20px Sans";
  ctx.fillStyle = "rgba(230, 240, 255, 0.9)";
  ctx.fillText("👥", 60, statY);
  ctx.font = "bold 18px Sans";
  ctx.fillText(`${memberCount} Members`, 90, statY);

  ctx.font = "20px Sans";
  ctx.fillText("♂️", 320, statY);
  ctx.font = "bold 18px Sans";
  ctx.fillText(`${maleCount} Male`, 350, statY);

  ctx.font = "20px Sans";
  ctx.fillText("♀️", 540, statY);
  ctx.font = "bold 18px Sans";
  ctx.fillText(`${femaleCount} Female`, 570, statY);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(300, statY - 12, 1, 24);
  ctx.fillRect(520, statY - 12, 1, 24);
  ctx.fillRect(760, statY - 12, 1, 24);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(200, 220, 255, 0.85)";
  ctx.font = "bold 17px Sans";
  ctx.fillText("Thanks for using: NEXUS BOT V1", W - 60, statY);

  ctx.strokeStyle = "rgba(150, 100, 220, 0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  return canvas.encode("png");
}

module.exports = {
  generateWelcomeCard,
  loadAvatar,
  loadGroupLogo,
  preloadBackground
};
// Powered by Shihab