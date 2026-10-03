/**
 * commands/fun/pair.js
 * NEXUS BOT V1 — Random boy-girl pair with anime love card
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

/* ═══ Anime image fetcher — multiple sources ═══ */
async function getAnimeImage(type) {
  const sources = type === "boy"
    ? [
        async () => {
          const r = await axios.get("https://nekos.best/api/v2/husbando", { timeout: 10000 });
          return r.data?.results?.[0]?.url;
        },
        async () => {
          const r = await axios.get("https://api.waifu.pics/sfw/husbando", { timeout: 10000 });
          return r.data?.url;
        },
        async () => {
          const r = await axios.get("https://api.waifu.im/search?included_tags=husbando&is_nsfw=false", { timeout: 10000 });
          return r.data?.images?.[0]?.url;
        }
      ]
    : [
        async () => {
          const r = await axios.get("https://nekos.best/api/v2/waifu", { timeout: 10000 });
          return r.data?.results?.[0]?.url;
        },
        async () => {
          const r = await axios.get("https://api.waifu.pics/sfw/waifu", { timeout: 10000 });
          return r.data?.url;
        },
        async () => {
          const r = await axios.get("https://api.waifu.im/search?included_tags=waifu&is_nsfw=false", { timeout: 10000 });
          return r.data?.images?.[0]?.url;
        }
      ];

  for (const fn of sources) {
    try {
      const url = await fn();
      if (!url) continue;
      const img = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 15000,
        maxContentLength: 10 * 1024 * 1024,
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "image/*,*/*"
        }
      });
      const buf = Buffer.from(img.data);
      if (buf.length > 1000) return buf;
    } catch (_) { continue; }
  }
  return null;
}

/* ═══ Circle clip avatar ═══ */
async function drawCircleAvatar(ctx, buf, cx, cy, r) {
  if (!buf) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#333";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 6;
    ctx.stroke();
    return;
  }
  try {
    const img = await loadImage(buf);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "#ff4d88";
    ctx.lineWidth = 2;
    ctx.stroke();
  } catch (_) {}
}

/* ═══ Draw anime character (rounded) ═══ */
async function drawAnime(ctx, buf, x, y, w, h) {
  if (!buf) return;
  try {
    const img = await loadImage(buf);

    ctx.save();
    const radius = 20;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.clip();

    const aspectImg = img.width / img.height;
    const aspectBox = w / h;
    let sx, sy, sw, sh;
    if (aspectImg > aspectBox) {
      sh = img.height;
      sw = sh * aspectBox;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = sw / aspectBox;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);
  } catch (_) {}
}

/* ═══ Main Command ═══ */
module.exports = {
  name: "pair",
  aliases: ["ship", "love", "couple", "match"],
  version: "1.0.0",
  role: 0,
  description: "Pair random boy and girl from group",
  usage: "/pair",
  category: "fun",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    if (!event.isGroup) {
      react("❌");
      return api.sendMessage("❌ Only works in groups", threadID);
    }

    react("⏳");

    try {
      /* ═══ Get group members ═══ */
      const threadInfo = await api.getThreadInfo(threadID);
      const members = threadInfo.participantIDs || [];
      const me = String(api.getCurrentUserID());
      const realMembers = members.filter((id) => String(id) !== me);

      if (realMembers.length < 2) {
        react("❌");
        return api.sendMessage("❌ Not enough members", threadID);
      }

      /* ═══ Get gender info ═══ */
      const userInfos = await api.getUserInfo(realMembers);

      const boys = [];
      const girls = [];

      for (const id of realMembers) {
        const info = userInfos[String(id)];
        if (!info || !info.name) continue;

        if (info.gender === 2) {
          boys.push({ id: String(id), name: info.name });
        } else if (info.gender === 1) {
          girls.push({ id: String(id), name: info.name });
        }
      }

      if (!boys.length || !girls.length) {
        react("❌");
        return api.sendMessage("❌ Not enough boy/girl detected", threadID);
      }

      /* ═══ Pick random boy + girl ═══ */
      const boy = boys[Math.floor(Math.random() * boys.length)];
      const girl = girls[Math.floor(Math.random() * girls.length)];

      /* ═══ Love % ═══ */
      const lovePct = 50 + Math.floor(Math.random() * 51);

      /* ═══ Download all images in parallel ═══ */
      const [boyPP, girlPP, animeBoy, animeGirl] = await Promise.all([
        getAvatar(boy.id),
        getAvatar(girl.id),
        getAnimeImage("boy"),
        getAnimeImage("girl")
      ]);

      /* ═══ Canvas setup ═══ */
      const W = 1000;
      const H = 720;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      /* Background */
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#ff9a9e");
      grad.addColorStop(0.5, "#fecfef");
      grad.addColorStop(1, "#a18cd1");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      /* Decorative hearts */
      const hearts = ["💕", "💖", "💗", "💘", "❤️", "💝"];
      ctx.font = "40px sans-serif";
      ctx.textAlign = "center";
      for (let i = 0; i < 8; i++) {
        ctx.fillText(
          hearts[Math.floor(Math.random() * hearts.length)],
          50 + Math.random() * (W - 100),
          40 + Math.random() * (H - 80)
        );
      }

      /* Title */
      ctx.fillStyle = "#fff";
      ctx.font = "bold 44px sans-serif";
      ctx.shadowColor = "#ff4d88";
      ctx.shadowBlur = 15;
      ctx.fillText("💕 LOVE MATCH 💕", W / 2, 60);
      ctx.shadowBlur = 0;

      /* Anime images */
      await drawAnime(ctx, animeBoy, 60, 100, 280, 380);
      await drawAnime(ctx, animeGirl, W - 60 - 280, 100, 280, 380);

      /* Center heart + % */
      ctx.font = "80px sans-serif";
      ctx.fillText("💗", W / 2, 220);

      ctx.fillStyle = "#ff2266";
      ctx.font = "bold 90px sans-serif";
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 20;
      ctx.fillText(`${lovePct}%`, W / 2, 320);
      ctx.shadowBlur = 0;

      /* FB avatars */
      await drawCircleAvatar(ctx, boyPP, 200, 500, 70);
      await drawCircleAvatar(ctx, girlPP, W - 200, 500, 70);

      /* Names */
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px sans-serif";
      ctx.shadowColor = "#ff4d88";
      ctx.shadowBlur = 10;
      ctx.fillText(boy.name.split(" ")[0].slice(0, 15), 200, 610);
      ctx.fillText(girl.name.split(" ")[0].slice(0, 15), W - 200, 610);
      ctx.shadowBlur = 0;

      /* Bottom message */
      ctx.fillStyle = "#fff";
      ctx.font = "italic 28px sans-serif";
      const msg = lovePct >= 85 ? "Perfect Match! 💘"
                : lovePct >= 70 ? "Great Chemistry! 💖"
                : lovePct >= 55 ? "Good Match! 💗"
                : "Try Harder! 💔";
      ctx.fillText(msg, W / 2, 680);

      /* ═══ Save + send ═══ */
      const tmpPath = path.join(os.tmpdir(), `pair_${Date.now()}.png`);
      await fs.writeFile(tmpPath, canvas.toBuffer("image/png"));

      api.sendMessage({
        body: `💕 ${boy.name} + ${girl.name} = ${lovePct}%`,
        mentions: [
          { tag: boy.name, id: boy.id },
          { tag: girl.name, id: girl.id }
        ],
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

      react("💕");

    } catch (e) {
      console.error("[pair] error:", e.message);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1