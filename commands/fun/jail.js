/**
 * commands/fun/jail.js
 * NEXUS BOT V1 — Put user behind jail bars
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

/* ═══ Avatar downloader with fallback ═══ */
async function getAvatar(uid) {
  const urls = [
    `https://graph.facebook.com/${uid}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
    `https://graph.facebook.com/${uid}/picture?type=large&width=720&height=720`
  ];
  for (const url of urls) {
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 15000,
        maxRedirects: 5,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const buf = Buffer.from(res.data);
      if (buf.length > 1000) return buf;
    } catch (_) { continue; }
  }
  return null;
}

/* ═══ Draw heart shape ═══ */
function drawHeart(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.beginPath();
  const top = size * 0.3;
  ctx.moveTo(cx, cy + top);
  ctx.bezierCurveTo(cx, cy, cx - size / 2, cy, cx - size / 2, cy + top);
  ctx.bezierCurveTo(cx - size / 2, cy + (size + top) / 2, cx, cy + (size + top) / 1.4, cx, cy + size);
  ctx.bezierCurveTo(cx, cy + (size + top) / 1.4, cx + size / 2, cy + (size + top) / 2, cx + size / 2, cy + top);
  ctx.bezierCurveTo(cx + size / 2, cy, cx, cy, cx, cy + top);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/* ═══ Main command ═══ */
module.exports = {
  name: "jail",
  aliases: ["prison", "cell", "lock"],
  version: "2.0.0",
  role: 0,
  description: "Put user behind jail bars",
  usage: "/jail (reply/mention) [reason]",
  category: "fun",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    react("⏳");

    try {
      /* ═══ Determine target user ═══ */
      let targetID = String(senderID);
      let targetName = "You";
      let reason = args.join(" ").trim() || "Breaking the rules";

      if (mentions && Object.keys(mentions).length) {
        targetID = String(Object.keys(mentions)[0]);
      } else if (messageReply && messageReply.senderID) {
        targetID = String(messageReply.senderID);
      }

      /* ═══ Get user full name ═══ */
      try {
        const ui = await api.getUserInfo(targetID);
        if (ui && ui[targetID] && ui[targetID].name) {
          targetName = ui[targetID].name;
        }
      } catch (_) {}

      /* ═══ Download avatar ═══ */
      const avatarBuf = await getAvatar(targetID);

      /* ═══ Canvas setup ═══ */
      const W = 800;
      const H = 800;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      /* ═══ Dark wall background ═══ */
      const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
      wallGrad.addColorStop(0, "#1a1a24");
      wallGrad.addColorStop(0.5, "#2a2a3a");
      wallGrad.addColorStop(1, "#0a0a12");
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, W, H);

      /* ═══ Wall texture — brick lines ═══ */
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1;
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      for (let x = 0; x < W; x += 80) {
        for (let y = 0; y < H; y += 80) {
          const offset = (Math.floor(y / 40) % 2) * 40;
          ctx.beginPath();
          ctx.moveTo(x + offset, y);
          ctx.lineTo(x + offset, y + 40);
          ctx.stroke();
        }
      }

      /* ═══ Draw avatar with frame (photo area) ═══ */
      const padding = 100;
      const photoW = W - padding * 2;
      const photoH = H - padding * 2;

      if (avatarBuf) {
        try {
          const img = await loadImage(avatarBuf);
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;

          /* Slight scale up for cover */
          ctx.drawImage(img, sx, sy, size, size, padding, padding, photoW, photoH);

          /* Dark overlay for jailed look */
          ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
          ctx.fillRect(padding, padding, photoW, photoH);

          /* Sepia tone overlay */
          ctx.fillStyle = "rgba(60, 40, 20, 0.25)";
          ctx.fillRect(padding, padding, photoW, photoH);
        } catch (_) {}
      } else {
        /* Placeholder */
        ctx.fillStyle = "#222";
        ctx.fillRect(padding, padding, photoW, photoH);
        ctx.fillStyle = "#666";
        ctx.font = "bold 60px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("NO IMAGE", W / 2, H / 2);
      }

      /* ═══ Photo frame border (rusty metal) ═══ */
      ctx.strokeStyle = "#4a4a4a";
      ctx.lineWidth = 12;
      ctx.strokeRect(padding - 6, padding - 6, photoW + 12, photoH + 12);

      ctx.strokeStyle = "#666";
      ctx.lineWidth = 4;
      ctx.strokeRect(padding - 2, padding - 2, photoW + 4, photoH + 4);

      /* ═══ Jail bars — thick vertical ═══ */
      const barWidth = 28;
      const barGap = 85;
      const barCount = Math.ceil(W / barGap) + 1;

      /* Metallic gradient */
      const barGrad = ctx.createLinearGradient(0, 0, barWidth, 0);
      barGrad.addColorStop(0, "#0a0a0a");
      barGrad.addColorStop(0.2, "#3a3a3a");
      barGrad.addColorStop(0.5, "#888888");
      barGrad.addColorStop(0.8, "#3a3a3a");
      barGrad.addColorStop(1, "#0a0a0a");

      for (let i = 0; i < barCount; i++) {
        const x = i * barGap - barWidth / 2;
        ctx.fillStyle = barGrad;
        ctx.fillRect(x, 0, barWidth, H);

        /* Bar highlight */
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(x + barWidth * 0.45, 0, 3, H);
      }

      /* ═══ Horizontal cross bars — top + bottom ═══ */
      const hBarGrad = ctx.createLinearGradient(0, 0, 0, barWidth);
      hBarGrad.addColorStop(0, "#0a0a0a");
      hBarGrad.addColorStop(0.2, "#3a3a3a");
      hBarGrad.addColorStop(0.5, "#888888");
      hBarGrad.addColorStop(0.8, "#3a3a3a");
      hBarGrad.addColorStop(1, "#0a0a0a");

      const hPositions = [40, H - 40 - barWidth];
      for (const y of hPositions) {
        ctx.fillStyle = hBarGrad;
        ctx.fillRect(0, y, W, barWidth);

        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(0, y + barWidth * 0.45, W, 3);
      }

      /* ═══ Rivets at intersections ═══ */
      for (let i = 0; i < barCount; i++) {
        const x = i * barGap;
        for (const y of hPositions) {
          ctx.beginPath();
          ctx.arc(x, y + barWidth / 2, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#aaa";
          ctx.fill();
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          /* Highlight */
          ctx.beginPath();
          ctx.arc(x - 1, y + barWidth / 2 - 1, 2, 0, Math.PI * 2);
          ctx.fillStyle = "#ddd";
          ctx.fill();
        }
      }

      /* ═══ Vignette (top + bottom shadow) ═══ */
      const topShadow = ctx.createLinearGradient(0, 0, 0, 150);
      topShadow.addColorStop(0, "rgba(0, 0, 0, 0.95)");
      topShadow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = topShadow;
      ctx.fillRect(0, 0, W, 150);

      const botShadow = ctx.createLinearGradient(0, H - 150, 0, H);
      botShadow.addColorStop(0, "rgba(0, 0, 0, 0)");
      botShadow.addColorStop(1, "rgba(0, 0, 0, 0.95)");
      ctx.fillStyle = botShadow;
      ctx.fillRect(0, H - 150, W, 150);

      /* ═══ Top title bar ═══ */
      ctx.fillStyle = "rgba(180, 20, 20, 0.9)";
      ctx.fillRect(W / 2 - 220, 60, 440, 60);

      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 3;
      ctx.strokeRect(W / 2 - 220, 60, 440, 60);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 38px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⛓ JAIL ⛓", W / 2, 105);

      /* ═══ Name label (bottom) ═══ */
      /* Dark pill */
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillRect(W / 2 - 320, H - 150, 640, 100);

      ctx.strokeStyle = "#ff3333";
      ctx.lineWidth = 3;
      ctx.strokeRect(W / 2 - 320, H - 150, 640, 100);

      /* Name */
      ctx.fillStyle = "#ff3333";
      ctx.font = "bold 32px sans-serif";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 8;

      /* Truncate long names */
      let displayName = targetName.toUpperCase();
      if (displayName.length > 30) displayName = displayName.slice(0, 27) + "...";

      ctx.fillText(displayName, W / 2, H - 105);
      ctx.shadowBlur = 0;

      /* Reason */
      ctx.fillStyle = "#ffffff";
      ctx.font = "italic 22px sans-serif";

      let displayReason = `"${reason}"`;
      if (displayReason.length > 45) displayReason = displayReason.slice(0, 42) + "...";

      ctx.fillText(displayReason, W / 2, H - 70);

      /* ═══ Save + send ═══ */
      const tmpPath = path.join(os.tmpdir(), `jail_${Date.now()}.png`);
      await fs.writeFile(tmpPath, canvas.toBuffer("image/png"));

      api.sendMessage({
        body: `🔒 <@${targetID}> is in jail!\n📝 Reason: ${reason}`,
        mentions: [{ tag: targetName, id: targetID }],
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

      react("🔒");

    } catch (e) {
      console.error("[jail] error:", e.message);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1