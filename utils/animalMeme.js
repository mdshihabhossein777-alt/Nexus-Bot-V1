// utils/animalMeme.js - NEXUS V1 - Realistic Face-Swap Meme
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const axios = require("axios");

const AVATAR_TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

/* ---------- Load user avatar ---------- */
async function loadAvatar(userID) {
  try {
    const url = `https://graph.facebook.com/${userID}/picture?width=1024&height=1024&access_token=${AVATAR_TOKEN}`;
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

/* ---------- Load animal image ---------- */
async function loadAnimalImage(basePrompt) {
  const realisticPrompt = [
    "ultra realistic photograph",
    "photorealistic",
    "professional wildlife photography",
    "national geographic style",
    "DSLR shot",
    "8k ultra HD",
    "sharp focus",
    "natural lighting",
    "shallow depth of field",
    "bokeh background",
    "highly detailed fur texture",
    basePrompt
  ].join(", ");

  const encoded = encodeURIComponent(realisticPrompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?model=flux&width=1024&height=1024&nologo=true&enhance=true`;

  const r = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 120000,
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  return await loadImage(Buffer.from(r.data));
}

/* ---------- Rounded rect ---------- */
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

/**
 * Generate realistic animal meme with user face overlaid on animal's face
 */
async function generateAnimalMeme(opts) {
  const {
    animalPrompt = "cute animal portrait",
    userName = "User",
    userAvatar = null,
    emoji = "🐾",
    label = "প্রাণী"
  } = opts;

  /* ============================================================
     1. FETCH REALISTIC ANIMAL IMAGE
     ============================================================ */
  const animalImg = await loadAnimalImage(animalPrompt);

  /* ============================================================
     2. CANVAS SETUP — Square 1024x1024
     ============================================================ */
  const W = 1024, H = 1024;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  /* Draw animal as base */
  ctx.drawImage(animalImg, 0, 0, W, H);

  /* ============================================================
     3. OVERLAY USER FACE ON ANIMAL'S FACE
     ============================================================ */
  if (userAvatar) {
    /* Face position — center of animal's head (typical portrait position) */
    const faceX = W / 2;             // horizontally centered
    const faceY = H * 0.38;          // slightly above center
    const faceR = W * 0.20;          // ~20% width radius

    /* --- Soft shadow behind face --- */
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 10;
    ctx.beginPath();
    ctx.arc(faceX, faceY, faceR + 4, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();

    /* --- Create soft-edge circular mask for user face --- */
    /* We'll draw the face with feathered edges for natural blending */
    const offCanvas = createCanvas(faceR * 2 + 40, faceR * 2 + 40);
    const offCtx = offCanvas.getContext("2d");
    const cx = faceR + 20, cy = faceR + 20;

    /* Draw user avatar */
    offCtx.save();
    offCtx.beginPath();
    offCtx.arc(cx, cy, faceR, 0, Math.PI * 2);
    offCtx.closePath();
    offCtx.clip();

    /* Fit avatar to circle — center crop */
    const avRatio = userAvatar.width / userAvatar.height;
    let drawW, drawH;
    if (avRatio > 1) {
      drawH = faceR * 2;
      drawW = drawH * avRatio;
    } else {
      drawW = faceR * 2;
      drawH = drawW / avRatio;
    }
    const dx = cx - drawW / 2;
    const dy = cy - drawH / 2;
    offCtx.drawImage(userAvatar, dx, dy, drawW, drawH);

    /* Circular vignette inside face (dark edges) */
    offCtx.globalCompositeOperation = "source-atop";
    const vig = offCtx.createRadialGradient(cx, cy, faceR * 0.6, cx, cy, faceR);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.55)");
    offCtx.fillStyle = vig;
    offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);
    offCtx.restore();

    /* Apply soft feather via multiple blurred rings */
    /* Outer soft edge — draw canvas multiple times with slight opacity */
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.globalAlpha = 0.3 - i * 0.08;
      ctx.drawImage(offCanvas, faceX - cx - (i * 2), faceY - cy - (i * 2),
                    offCanvas.width + i * 4, offCanvas.height + i * 4);
      ctx.restore();
    }

    /* Main face draw */
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(offCanvas, faceX - cx, faceY - cy);
    ctx.restore();

    /* --- Colored ring border --- */
    ctx.save();
    ctx.beginPath();
    ctx.arc(faceX, faceY, faceR + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(faceX, faceY, faceR + 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 61, 139, 0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  /* ============================================================
     4. TOP-LEFT EMOJI BADGE
     ============================================================ */
  ctx.save();
  ctx.font = "bold 80px Sans";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 20;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(emoji, 35, 35);
  ctx.restore();

  /* ============================================================
     5. BOTTOM GRADIENT OVERLAY
     ============================================================ */
  const grad = ctx.createLinearGradient(0, H - 320, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.6)");
  grad.addColorStop(1, "rgba(0,0,0,0.95)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - 320, W, 320);

  /* ============================================================
     6. NAME + LABEL TEXT (center bottom)
     ============================================================ */
  ctx.textAlign = "center";

  /* Bengali label */
  ctx.fillStyle = "rgba(255, 220, 240, 0.85)";
  ctx.font = "italic 30px Sans";
  ctx.fillText(`— ${label} —`, W / 2, H - 145);

  /* User name */
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 15;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 58px Sans";
  const displayName = String(userName).slice(0, 22);
  ctx.fillText(displayName, W / 2, H - 70);
  ctx.restore();

  /* ============================================================
     7. FOOTER: "Shihab" (bottom-right)
     ============================================================ */
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.font = "bold 18px Sans";
  ctx.fillText("Shihab", W - 25, H - 20);

  ctx.textAlign = "left";
  return canvas.encode("png");
}

module.exports = { generateAnimalMeme, loadAvatar };
// Powered by Shihab