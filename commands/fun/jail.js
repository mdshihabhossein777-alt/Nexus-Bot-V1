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

/* ═══ Avatar downloader ═══ */
async function getAvatar(uid) {
  try {
    const url = `https://graph.facebook.com/${uid}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      maxRedirects: 5,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    return Buffer.from(res.data);
  } catch (_) {
    return null;
  }
}

/* ═══ Main command ═══ */
module.exports = {
  name: "jail",
  aliases: ["prison", "cell"],
  version: "1.0.0",
  role: 0,
  description: "Put user behind jail bars",
  usage: "/jail (reply/mention or self)",
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

      if (mentions && Object.keys(mentions).length) {
        targetID = String(Object.keys(mentions)[0]);
      } else if (messageReply && messageReply.senderID) {
        targetID = String(messageReply.senderID);
      }

      /* ═══ Get user name ═══ */
      try {
        const ui = await api.getUserInfo(targetID);
        if (ui && ui[targetID] && ui[targetID].name) {
          targetName = ui[targetID].name.split(" ")[0];
        }
      } catch (_) {}

      /* ═══ Download avatar ═══ */
      const avatarBuf = await getAvatar(targetID);
      if (!avatarBuf) {
        react("❌");
        return api.sendMessage("❌ Failed to fetch avatar", threadID);
      }

      /* ═══ Canvas setup ═══ */
      const W = 700;
      const H = 700;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      /* ═══ Background — dark wall ═══ */
      const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
      wallGrad.addColorStop(0, "#2a2a2a");
      wallGrad.addColorStop(1, "#0f0f0f");
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, W, H);

      /* ═══ Draw avatar (center) ═══ */
      try {
        const img = await loadImage(avatarBuf);

        /* Square crop from center */
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;

        /* Draw avatar slightly desaturated look via overlay */
        ctx.drawImage(img, sx, sy, size, size, 80, 80, W - 160, H - 160);

        /* Dark overlay for jailed look */
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.fillRect(80, 80, W - 160, H - 160);
      } catch (_) {
        /* Fallback: placeholder */
        ctx.fillStyle = "#333";
        ctx.fillRect(80, 80, W - 160, H - 160);
        ctx.fillStyle = "#888";
        ctx.font = "bold 60px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("NO IMAGE", W / 2, H / 2);
      }

      /* ═══ Jail bars — vertical ═══ */
      const barWidth = 22;
      const barGap = 70;
      const barCount = Math.floor(W / barGap) + 1;

      /* Bar gradient (metallic look) */
      const barGrad = ctx.createLinearGradient(0, 0, barWidth, 0);
      barGrad.addColorStop(0, "#1a1a1a");
      barGrad.addColorStop(0.3, "#555555");
      barGrad.addColorStop(0.5, "#888888");
      barGrad.addColorStop(0.7, "#555555");
      barGrad.addColorStop(1, "#1a1a1a");

      for (let i = 0; i < barCount; i++) {
        const x = i * barGap;
        ctx.fillStyle = barGrad;
        ctx.fillRect(x, 0, barWidth, H);
      }

      /* ═══ Horizontal cross bars (top + middle + bottom) ═══ */
      const hBarGrad = ctx.createLinearGradient(0, 0, 0, barWidth);
      hBarGrad.addColorStop(0, "#1a1a1a");
      hBarGrad.addColorStop(0.3, "#555555");
      hBarGrad.addColorStop(0.5, "#888888");
      hBarGrad.addColorStop(0.7, "#555555");
      hBarGrad.addColorStop(1, "#1a1a1a");

      const hPositions = [30, H / 2 - 11, H - 30 - barWidth];
      for (const y of hPositions) {
        ctx.fillStyle = hBarGrad;
        ctx.fillRect(0, y, W, barWidth);
      }

      /* ═══ Metal rivets on bars ═══ */
      for (let i = 0; i < barCount; i++) {
        const x = i * barGap + barWidth / 2;
        for (const y of hPositions) {
          ctx.beginPath();
          ctx.arc(x, y + barWidth / 2, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#aaa";
          ctx.fill();
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      /* ═══ Shadow top + bottom (vignette) ═══ */
      const topShadow = ctx.createLinearGradient(0, 0, 0, 100);
      topShadow.addColorStop(0, "rgba(0,0,0,0.9)");
      topShadow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = topShadow;
      ctx.fillRect(0, 0, W, 100);

      const botShadow = ctx.createLinearGradient(0, H - 100, 0, H);
      botShadow.addColorStop(0, "rgba(0,0,0,0)");
      botShadow.addColorStop(1, "rgba(0,0,0,0.9)");
      ctx.fillStyle = botShadow;
      ctx.fillRect(0, H - 100, W, 100);

      /* ═══ Name label (bottom) ═══ */
      ctx.fillStyle = "#ff2222";
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 8;
      ctx.fillText(`${targetName.toUpperCase()} IS IN JAIL!`, W / 2, H - 40);
      ctx.shadowBlur = 0;

      /* ═══ Save + send ═══ */
      const tmpPath = path.join(os.tmpdir(), `jail_${Date.now()}.png`);
      await fs.writeFile(tmpPath, canvas.toBuffer("image/png"));

      api.sendMessage({
        body: `🔒 <@${targetID}> is in jail!`,
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