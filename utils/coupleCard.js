// utils/coupleCard.js - NEXUS V1 - Romantic Couple Cards
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const axios = require("axios");

const AVATAR_TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

/* ---------- Load avatar ---------- */
async function loadAvatar(userID) {
  try {
    const url = `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=${AVATAR_TOKEN}`;
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    return await loadImage(Buffer.from(r.data));
  } catch (_) {
    return null;
  }
}

/* ---------- Fetch AI couple image ---------- */
async function loadCoupleImage(prompt) {
  const fullPrompt = `${prompt}, anime art style, romantic, ultra detailed, soft lighting, pastel colors, cinematic, manga illustration, highly detailed, beautiful composition`;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?model=flux&width=1024&height=1024&nologo=true&enhance=true`;

  const r = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 120000,
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  return await loadImage(Buffer.from(r.data));
}

/* ---------- Draw circular avatar with soft ring ---------- */
function drawFaceOverlay(ctx, avatar, cx, cy, r, ringColor) {
  if (!avatar) {
    /* Fallback circle */
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  /* Soft outer shadow */
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();

  /* Clip & draw avatar */
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  /* Center-crop avatar */
  const ratio = avatar.width / avatar.height;
  let drawW, drawH;
  if (ratio > 1) {
    drawH = r * 2;
    drawW = drawH * ratio;
  } else {
    drawW = r * 2;
    drawH = drawW / ratio;
  }
  ctx.drawImage(avatar, cx - drawW / 2, cy - drawH / 2, drawW, drawH);

  /* Dark vignette for blending */
  const vig = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vig;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();

  /* Soft gradient ring */
  const ringGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ringGrad.addColorStop(0, ringColor);
  ringGrad.addColorStop(1, "#ffffff");

  ctx.save();
  ctx.shadowColor = ringColor;
  ctx.shadowBlur = 15;
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  /* Inner white ring */
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

/* ---------- Truncate ---------- */
function truncate(str, n) {
  const s = String(str || "User");
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/* ================================================================
   MAIN — Generate Couple Card
   ================================================================ */
async function generateCoupleCard(opts) {
  const {
    scenePrompt,        // AI scene (wedding, kiss, hug, etc.)
    user1Name = "User 1",
    user1Avatar = null,
    user2Name = "User 2",
    user2Avatar = null,
    message = "married",
    emoji = "💕",
    ringColor1 = "#ff3d8b",
    ringColor2 = "#00d9ff",
    footerText = "Shihab",
    extraText = "" // e.g. "বিয়েশাদি" or "রোমান্টিক"
  } = opts;

  /* 1. Load AI scene */
  const sceneImg = await loadCoupleImage(scenePrompt);

  /* 2. Canvas setup — 1024x1024 */
  const W = 1024, H = 1024;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  /* Draw scene as base */
  ctx.drawImage(sceneImg, 0, 0, W, H);

  /* 3. Face positions — 2 faces on the two characters */
  /* Generic positions — works for most couple scene compositions */
  const face1 = { x: W * 0.36, y: H * 0.36, r: W * 0.11 };   // left character
  const face2 = { x: W * 0.63, y: H * 0.36, r: W * 0.11 };   // right character

  /* Draw both faces */
  drawFaceOverlay(ctx, user1Avatar, face1.x, face1.y, face1.r, ringColor1);
  drawFaceOverlay(ctx, user2Avatar, face2.x, face2.y, face2.r, ringColor2);

  /* 4. Bottom gradient overlay */
  const grad = ctx.createLinearGradient(0, H - 280, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0.95)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - 280, W, 280);

  /* 5. Header (small, top-left) */
  ctx.save();
  ctx.font = "bold 60px Sans";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 20;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(emoji, 30, 30);
  ctx.restore();

  /* 6. Center text — "Name1 + Name2" */
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  /* Heart divider */
  ctx.save();
  ctx.shadowColor = "rgba(255, 61, 139, 0.8)";
  ctx.shadowBlur = 20;

  /* Name 1 */
  ctx.fillStyle = ringColor1;
  ctx.font = "bold 38px Sans";
  const name1 = truncate(user1Name, 16);
  ctx.fillText(name1, W * 0.28, H - 130);

  /* Heart */
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px Sans";
  ctx.fillText("❤", W / 2, H - 128);

  /* Name 2 */
  ctx.fillStyle = ringColor2;
  ctx.font = "bold 38px Sans";
  const name2 = truncate(user2Name, 16);
  ctx.fillText(name2, W * 0.72, H - 130);

  ctx.restore();

  /* Message line */
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = "italic 24px Sans";
  const msgText = extraText
    ? `${name1} ${message} ${name2} ${extraText}`
    : `${name1} ${message} ${name2}`;
  ctx.fillText(msgText, W / 2, H - 70);

  /* 7. Footer "Shihab" */
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "bold 16px Sans";
  ctx.fillText(footerText, W - 20, H - 20);

  ctx.textAlign = "left";
  return canvas.encode("png");
}

module.exports = { generateCoupleCard, loadAvatar };
// Powered by Shihab