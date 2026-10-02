// commands/fun/slap.js - NEXUS V1 - Manual slap scene (clear action)
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const axios = require("axios");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

async function loadAvatar(userID) {
  try {
    const url = `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`;
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    return await loadImage(Buffer.from(r.data));
  } catch (_) { return null; }
}

function react(api, emoji, messageID, threadID) {
  return new Promise((resolve) => {
    if (!messageID || !threadID) return resolve(false);
    try {
      api.setMessageReaction(emoji, messageID, threadID, (err) => resolve(!err));
    } catch (_) { resolve(false); }
  });
}

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

/* Draw avatar in circle */
function drawAvatar(ctx, img, cx, cy, r, ring) {
  if (!img) {
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  /* Outer glow ring */
  ctx.save();
  ctx.shadowColor = ring;
  ctx.shadowBlur = 30;
  ctx.strokeStyle = ring;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  /* White inner ring */
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
  ctx.stroke();

  /* Clip and draw */
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

/* Draw speed lines */
function drawSpeedLines(ctx, cx, cy, length, count, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.8;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5);
    const inner = length * 0.6;
    const outer = length;
    const x1 = cx + Math.cos(angle) * inner;
    const y1 = cy + Math.sin(angle) * inner;
    const x2 = cx + Math.cos(angle) * outer;
    const y2 = cy + Math.sin(angle) * outer;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

/* Draw impact star (manga style) */
function drawImpactStar(ctx, cx, cy, size) {
  /* Big yellow/red star burst */
  ctx.save();
  ctx.translate(cx, cy);

  const spikes = 16;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (Math.PI * 2 / (spikes * 2)) * i;
    const r = i % 2 === 0 ? size : size * 0.55;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const grad = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.4, "#ffea00");
  grad.addColorStop(0.7, "#ff8c00");
  grad.addColorStop(1, "#ff3d00");

  ctx.fillStyle = grad;
  ctx.shadowColor = "#ff3d00";
  ctx.shadowBlur = 30;
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.restore();

  /* Big "POW!" text on top */
  ctx.save();
  ctx.font = "bold 90px Sans";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 10;
  ctx.strokeText("POW!", cx, cy + 4);
  ctx.fillStyle = "#ffea00";
  ctx.fillText("POW!", cx, cy);
  ctx.restore();
}

/* Draw hand (slapping hand) */
function drawHand(ctx, x, y, angle, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.font = `bold ${size}px Sans`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#ff3d8b";
  ctx.shadowBlur = 25;
  ctx.fillText("👋", 0, 0);
  ctx.restore();
}

module.exports = {
  name: "slap",
  aliases: ["bonk", "smack"],
  version: "5.0.0",
  role: 0,
  description: "Slap someone with a clear slap card 👋",
  usage: "/slap @user",
  execute: async function (api, event, args, db) {
    const { threadID, senderID, mentions, messageReply, messageID } = event;
    let tmpPath = null;

    try {
      let target = null;
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);

      if (!target) return api.sendMessage("👋 Usage: /slap @user  (or reply)", threadID);
      if (target === String(senderID)) return api.sendMessage("😅 নিজেকে slap করা যায় না!", threadID);

      /* React ⏳ */
      await react(api, "⏳", messageID, threadID);

      /* Names */
      let name1 = "User", name2 = "Target";
      try {
        const info = await api.getUserInfo([String(senderID), target]);
        if (info[String(senderID)]) name1 = info[String(senderID)].name;
        if (info[target]) name2 = info[target].name;
      } catch (_) {}

      const av1 = await loadAvatar(String(senderID));
      const av2 = await loadAvatar(target);

      /* ============================================================
         CANVAS — Manual Slap Scene
         ============================================================ */
      const W = 1024, H = 1024;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      /* ---- Background: Radial dark red/pink gradient (manga style) ---- */
      const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.75);
      bgGrad.addColorStop(0, "#3a0a1a");
      bgGrad.addColorStop(0.5, "#1a0510");
      bgGrad.addColorStop(1, "#0a0005");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      /* ---- Diagonal speed lines from center (manga action) ---- */
      ctx.save();
      ctx.strokeStyle = "rgba(255, 100, 150, 0.35)";
      ctx.lineWidth = 4;
      for (let i = 0; i < 60; i++) {
        const angle = (Math.PI * 2 / 60) * i;
        const innerR = 200;
        const outerR = 1400;
        const x1 = W / 2 + Math.cos(angle) * innerR;
        const y1 = H / 2 + Math.sin(angle) * innerR;
        const x2 = W / 2 + Math.cos(angle) * outerR;
        const y2 = H / 2 + Math.sin(angle) * outerR;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      /* ---- Draw ATTACKER (left) ---- */
      const attackerX = W * 0.30;
      const attackerY = H * 0.42;
      const avatarR = W * 0.13;

      /* Attacker's arm/hand reaching out to slap */
      drawHand(ctx, W * 0.52, H * 0.40, -0.3, 160);

      /* Attacker avatar */
      drawAvatar(ctx, av1, attackerX, attackerY, avatarR, "#ff3d8b");

      /* ---- Draw VICTIM (right) ---- */
      const victimX = W * 0.70;
      const victimY = H * 0.42;

      /* Victim avatar (tilted from impact) */
      ctx.save();
      ctx.translate(victimX, victimY);
      ctx.rotate(0.15); // tilt from slap
      ctx.translate(-victimX, -victimY);
      drawAvatar(ctx, av2, victimX, victimY, avatarR, "#ffea00");
      ctx.restore();

      /* ---- Impact effect between them ---- */
      drawImpactStar(ctx, W * 0.52, H * 0.40, 130);

      /* ---- Extra sparkles ---- */
      for (let i = 0; i < 8; i++) {
        const sx = W * 0.52 + (Math.random() - 0.5) * 400;
        const sy = H * 0.40 + (Math.random() - 0.5) * 400;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(sx, sy, Math.random() * 4 + 2, 0, Math.PI * 2);
        ctx.fill();
      }

      /* ---- Bottom gradient ---- */
      const grad = ctx.createLinearGradient(0, H - 300, 0, H);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.5, "rgba(0,0,0,0.7)");
      grad.addColorStop(1, "rgba(0,0,0,0.98)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, H - 300, W, 300);

      /* ---- Top emoji ---- */
      ctx.save();
      ctx.font = "bold 70px Sans";
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#fff";
      ctx.fillText("👋", 30, 90);
      ctx.restore();

      /* ---- Names + message ---- */
      ctx.textAlign = "center";

      /* Attacker name */
      ctx.save();
      ctx.font = "bold 44px Sans";
      ctx.shadowColor = "rgba(255,61,139,0.8)";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#ff3d8b";
      ctx.fillText(name1.slice(0, 16), W * 0.25, H - 130);
      ctx.restore();

      /* VS symbol */
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px Sans";
      ctx.fillText("👋", W / 2, H - 128);

      /* Victim name */
      ctx.save();
      ctx.font = "bold 44px Sans";
      ctx.shadowColor = "rgba(255,234,0,0.8)";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#ffea00";
      ctx.fillText(name2.slice(0, 16), W * 0.75, H - 130);
      ctx.restore();

      /* Message */
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = "italic 26px Sans";
      ctx.fillText(`💥 ${name1} slapped ${name2}!`, W / 2, H - 65);

      /* Footer */
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "bold 18px Sans";
      ctx.fillText("Shihab", W - 25, H - 20);

      /* Save + Send */
      const buf = await canvas.encode("png");
      tmpPath = path.join(os.tmpdir(), `nexus_slap_${Date.now()}.png`);
      await fs.writeFile(tmpPath, buf);

      await react(api, "✅", messageID, threadID);

      api.sendMessage({
        body: `👋 ${name1} slapped ${name2}!`,
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[slap] error:", e.message);
      await react(api, "❌", messageID, threadID);
      api.sendMessage("❌ Failed: " + e.message, threadID);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    }
  }
};
// Powered by Shihab