/**
 * commands/fun/pair.js
 * NEXUS BOT V1 — Sender-based pair with anime love card
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

/* ═══ Gender detection — handles number + string ═══ */
function detectGender(info) {
  if (!info) return null;
  const g = info.gender;

  if (g === 1) return "female";
  if (g === 2) return "male";

  if (typeof g === "string") {
    const low = g.toLowerCase();
    if (["female", "f", "woman", "girl", "meye", "mey"].includes(low)) return "female";
    if (["male", "m", "man", "boy", "chele", "chele"].includes(low)) return "male";
  }
  return null;
}

/* ═══ Avatar downloader ═══ */
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

/* ═══ Anime image fetcher — better sources ═══ */
async function getAnimeImage(type) {
  const sources = type === "boy"
    ? [
        async () => {
          const r = await axios.get("https://nekos.best/api/v2/husbando", { timeout: 12000 });
          return r.data?.results?.[0]?.url;
        },
        async () => {
          const r = await axios.get("https://api.waifu.im/search?included_tags=husbando&is_nsfw=false&height=>=1000", { timeout: 12000 });
          return r.data?.images?.[0]?.url;
        },
        async () => {
          const r = await axios.get("https://api.waifu.pics/sfw/husbando", { timeout: 12000 });
          return r.data?.url;
        },
        async () => {
          const r = await axios.get("https://api.otakugifs.xyz/gif?reaction=hug", { timeout: 12000 });
          return r.data?.url;
        }
      ]
    : [
        async () => {
          const r = await axios.get("https://nekos.best/api/v2/waifu", { timeout: 12000 });
          return r.data?.results?.[0]?.url;
        },
        async () => {
          const r = await axios.get("https://api.waifu.im/search?included_tags=waifu&is_nsfw=false&height=>=1000", { timeout: 12000 });
          return r.data?.images?.[0]?.url;
        },
        async () => {
          const r = await axios.get("https://api.waifu.pics/sfw/waifu", { timeout: 12000 });
          return r.data?.url;
        },
        async () => {
          const r = await axios.get("https://api.otakugifs.xyz/gif?reaction=blush", { timeout: 12000 });
          return r.data?.url;
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
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "image/*,*/*" }
      });
      const buf = Buffer.from(img.data);
      if (buf.length > 2000) {
        console.log(`[pair] anime ${type}: ${(buf.length / 1024).toFixed(0)} KB`);
        return buf;
      }
    } catch (_) { continue; }
  }
  console.log(`[pair] anime ${type}: failed`);
  return null;
}

/* ═══ Draw circle avatar ═══ */
async function drawCircleAvatar(ctx, buf, cx, cy, r) {
  if (!buf) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#333";
    ctx.fill();
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

    /* Outer glow ring */
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 77, 136, 0.5)";
    ctx.lineWidth = 8;
    ctx.stroke();

    /* Main ring */
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#ff2266";
    ctx.lineWidth = 3;
    ctx.stroke();
  } catch (_) {}
}

/* ═══ Draw rounded anime image (portrait) ═══ */
async function drawAnime(ctx, buf, x, y, w, h) {
  const radius = 25;

  /* Draw frame background (even if no image) */
  ctx.save();
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

  if (!buf) {
    /* Placeholder */
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "#ff9ec4");
    g.addColorStop(1, "#ff4d88");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 100px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("?", x + w / 2, y + h / 2 + 30);
    ctx.restore();
  } else {
    try {
      const img = await loadImage(buf);

      /* Cover fit */
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
    } catch (e) {
      ctx.restore();
      console.log(`[pair] draw fail: ${e.message}`);
    }
  }

  /* Outer glow ring */
  ctx.save();
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
  ctx.strokeStyle = "rgba(255, 77, 136, 0.6)";
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.strokeStyle = "#ff2266";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/* ═══ Draw heart shape ═══ */
function drawHeart(ctx, cx, cy, size, color, strokeColor, strokeWidth) {
  ctx.save();
  ctx.beginPath();
  const top = size * 0.3;
  ctx.moveTo(cx, cy + top);
  ctx.bezierCurveTo(cx, cy, cx - size / 2, cy, cx - size / 2, cy + top);
  ctx.bezierCurveTo(cx - size / 2, cy + (size + top) / 2, cx, cy + (size + top) / 1.4, cx, cy + size);
  ctx.bezierCurveTo(cx, cy + (size + top) / 1.4, cx + size / 2, cy + (size + top) / 2, cx + size / 2, cy + top);
  ctx.bezierCurveTo(cx + size / 2, cy, cx, cy, cx, cy + top);
  ctx.closePath();

  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth || 3;
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/* ═══ Main Command ═══ */
module.exports = {
  name: "pair",
  aliases: ["ship", "love", "couple", "match"],
  version: "2.0.0",
  role: 0,
  description: "Pair yourself with a random opposite gender",
  usage: "/pair",
  category: "fun",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

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
      /* ═══ Get sender info + gender ═══ */
      const senderInfo = (await api.getUserInfo(String(senderID)))[String(senderID)];
      if (!senderInfo || !senderInfo.name) {
        react("❌");
        return api.sendMessage("❌ Could not read your profile", threadID);
      }

      const senderGender = detectGender(senderInfo);
      console.log(`[pair] sender: ${senderInfo.name} gender: ${senderGender}`);

      if (!senderGender) {
        react("❌");
        return api.sendMessage(
          "❌ Set your gender on Facebook first (Profile → About → Gender)",
          threadID
        );
      }

      /* ═══ Get group members ═══ */
      const threadInfo = await api.getThreadInfo(threadID);
      const members = threadInfo.participantIDs || [];
      const me = String(api.getCurrentUserID());
      const realMembers = members.filter((id) => String(id) !== me && String(id) !== String(senderID));

      console.log(`[pair] members: ${realMembers.length}`);

      if (realMembers.length < 1) {
        react("❌");
        return api.sendMessage("❌ Not enough members", threadID);
      }

      /* ═══ Find opposite gender pool ═══ */
      const wantedGender = senderGender === "male" ? "female" : "male";
      const pool = [];

      for (const id of realMembers) {
        try {
          const ui = await api.getUserInfo(String(id));
          const info = ui && ui[String(id)];
          if (!info || !info.name) continue;

          const g = detectGender(info);
          if (g === wantedGender) {
            pool.push({ id: String(id), name: info.name });
          }
        } catch (_) { continue; }
      }

      console.log(`[pair] pool (${wantedGender}): ${pool.length}`);

      if (pool.length === 0) {
        react("❌");
        const genderLabel = wantedGender === "male" ? "chele" : "meye";
        return api.sendMessage(`❌ Group e kono ${genderLabel} pawa gelo na`, threadID);
      }

      /* ═══ Pick random partner ═══ */
      const partner = pool[Math.floor(Math.random() * pool.length)];

      /* ═══ Assign boy/girl based on genders ═══ */
      const boy = senderGender === "male"
        ? { id: String(senderID), name: senderInfo.name }
        : partner;
      const girl = senderGender === "female"
        ? { id: String(senderID), name: senderInfo.name }
        : partner;

      /* ═══ Love % ═══ */
      const lovePct = 50 + Math.floor(Math.random() * 51);

      /* ═══ Download images in parallel ═══ */
      const [boyPP, girlPP, animeBoy, animeGirl] = await Promise.all([
        getAvatar(boy.id).catch(() => null),
        getAvatar(girl.id).catch(() => null),
        getAnimeImage("boy").catch(() => null),
        getAnimeImage("girl").catch(() => null)
      ]);

      /* ═══ Canvas setup ═══ */
      const W = 1000;
      const H = 720;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      /* Background gradient */
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#ff6ba9");
      grad.addColorStop(0.5, "#ff9ec4");
      grad.addColorStop(1, "#b47edb");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      /* Glow circles */
      for (let i = 0; i < 5; i++) {
        const cx = Math.random() * W;
        const cy = Math.random() * H;
        const r = 80 + Math.random() * 120;
        const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g2.addColorStop(0, "rgba(255, 255, 255, 0.15)");
        g2.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      /* Decorative hearts */
      const heartColors = ["#ff2266", "#ff4d88", "#ff88aa", "#ffffff", "#ffb3cc"];
      for (let i = 0; i < 14; i++) {
        const x = 30 + Math.random() * (W - 60);
        const y = 30 + Math.random() * (H - 60);
        const s = 15 + Math.random() * 20;
        const c = heartColors[Math.floor(Math.random() * heartColors.length)];
        drawHeart(ctx, x, y, s, c);
      }

      /* Top banner */
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.fillRect(W / 2 - 260, 25, 520, 80);

      /* Banner border */
      ctx.strokeStyle = "#ff2266";
      ctx.lineWidth = 3;
      ctx.strokeRect(W / 2 - 260, 25, 520, 80);

      ctx.fillStyle = "#ff2266";
      ctx.font = "bold 48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("❤ LOVE MATCH ❤", W / 2, 85);

      /* Draw anime boy (left) */
      await drawAnime(ctx, animeBoy, 40, 130, 300, 400);

      /* Draw anime girl (right) */
      await drawAnime(ctx, animeGirl, W - 340, 130, 300, 400);

      /* Center heart glow */
      const centerGlow = ctx.createRadialGradient(W / 2, 300, 0, W / 2, 300, 150);
      centerGlow.addColorStop(0, "rgba(255, 34, 102, 0.9)");
      centerGlow.addColorStop(1, "rgba(255, 34, 102, 0)");
      ctx.fillStyle = centerGlow;
      ctx.beginPath();
      ctx.arc(W / 2, 300, 150, 0, Math.PI * 2);
      ctx.fill();

      /* Big heart with % */
      drawHeart(ctx, W / 2, 230, 130, "#ff2266", "#ffffff", 4);
      drawHeart(ctx, W / 2, 220, 100, "#ff4d88");

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 68px sans-serif";
      ctx.strokeStyle = "#8b0033";
      ctx.lineWidth = 6;
      ctx.textAlign = "center";
      ctx.strokeText(`${lovePct}%`, W / 2, 305);
      ctx.fillText(`${lovePct}%`, W / 2, 305);

      /* FB avatars bottom */
      await drawCircleAvatar(ctx, boyPP, 200, 580, 80);
      await drawCircleAvatar(ctx, girlPP, W - 200, 580, 80);

      /* Names */
      const boyName = String(boy.name).split(" ")[0].slice(0, 15);
      const girlName = String(girl.name).split(" ")[0].slice(0, 15);

      /* Name pills */
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      const bw = 220;
      ctx.fillRect(200 - bw / 2, 675, bw, 40);
      ctx.fillRect(W - 200 - bw / 2, 675, bw, 40);

      ctx.strokeStyle = "#ff2266";
      ctx.lineWidth = 2;
      ctx.strokeRect(200 - bw / 2, 675, bw, 40);
      ctx.strokeRect(W - 200 - bw / 2, 675, bw, 40);

      ctx.fillStyle = "#ff2266";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(boyName, 200, 704);
      ctx.fillText(girlName, W - 200, 704);

      /* Match message */
      const msg = lovePct >= 85 ? "Perfect Match!"
                : lovePct >= 70 ? "Great Chemistry!"
                : lovePct >= 55 ? "Good Match!"
                : "Try Harder!";
      ctx.fillStyle = "#ffffff";
      ctx.font = "italic bold 26px sans-serif";
      ctx.strokeStyle = "#ff2266";
      ctx.lineWidth = 4;
      ctx.strokeText(msg, W / 2, 700);
      ctx.fillText(msg, W / 2, 700);

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
      api.sendMessage(`❌ ${e.message.slice(0, 80)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1