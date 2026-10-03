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
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "image/*,*/*" }
      });
      const buf = Buffer.from(img.data);
      if (buf.length > 1000) return buf;
    } catch (_) { continue; }
  }
  return null;
}

/* ═══ Draw circle avatar ═══ */
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

/* ═══ Draw rounded anime image ═══ */
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

/* ═══ Draw heart shape (no emoji font needed) ═══ */
function drawHeart(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(cx, cy + topCurveHeight);
  /* Left curve */
  ctx.bezierCurveTo(cx, cy, cx - size / 2, cy, cx - size / 2, cy + topCurveHeight);
  /* Top left */
  ctx.bezierCurveTo(cx - size / 2, cy + (size + topCurveHeight) / 2, cx, cy + (size + topCurveHeight) / 1.4, cx, cy + size);
  /* Top right */
  ctx.bezierCurveTo(cx, cy + (size + topCurveHeight) / 1.4, cx + size / 2, cy + (size + topCurveHeight) / 2, cx + size / 2, cy + topCurveHeight);
  /* Right curve */
  ctx.bezierCurveTo(cx + size / 2, cy, cx, cy, cx, cy + topCurveHeight);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ═══ Gender detection — handles both number and string ═══ */
function detectGender(info) {
  if (!info) return null;
  const g = info.gender;

  /* Number format */
  if (g === 1) return "female";
  if (g === 2) return "male";

  /* String format */
  if (typeof g === "string") {
    const low = g.toLowerCase();
    if (low === "female" || low === "f" || low === "woman" || low === "meye" || low === "girl") return "female";
    if (low === "male" || low === "m" || low === "man" || low === "chele" || low === "boy") return "male";
  }

  return null;
}

/* ═══ Main Command ═══ */
module.exports = {
  name: "pair",
  aliases: ["ship", "love", "couple", "match"],
  version: "1.1.0",
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

      console.log(`[pair] members: ${realMembers.length}`);

      if (realMembers.length < 2) {
        react("❌");
        return api.sendMessage("❌ Not enough members", threadID);
      }

      /* ═══ Get user info — one-by-one for reliability ═══ */
      const boys = [];
      const girls = [];
      const unknown = [];

      for (const id of realMembers) {
        try {
          const ui = await api.getUserInfo(String(id));
          const info = ui && ui[String(id)];
          if (!info || !info.name) continue;

          const gender = detectGender(info);
          if (gender === "male") boys.push({ id: String(id), name: info.name });
          else if (gender === "female") girls.push({ id: String(id), name: info.name });
          else unknown.push({ id: String(id), name: info.name });
        } catch (_) {
          continue;
        }
      }

      console.log(`[pair] boys: ${boys.length} | girls: ${girls.length} | unknown: ${unknown.length}`);

      /* ═══ Fallback: if not enough, split randomly ═══ */
      let boyPool = [...boys];
      let girlPool = [...girls];

      if (boyPool.length === 0 || girlPool.length === 0) {
        /* Mix unknown + existing, split randomly */
        const all = [...boys, ...girls, ...unknown];
        if (all.length < 2) {
          react("❌");
          return api.sendMessage("❌ Gender info not available", threadID);
        }
        const shuffled = all.sort(() => Math.random() - 0.5);
        const mid = Math.floor(shuffled.length / 2);
        boyPool = shuffled.slice(0, mid);
        girlPool = shuffled.slice(mid);
      }

      /* ═══ Pick random boy + girl ═══ */
      const boy = boyPool[Math.floor(Math.random() * boyPool.length)];
      const girl = girlPool[Math.floor(Math.random() * girlPool.length)];

      /* ═══ Love % ═══ */
      const lovePct = 50 + Math.floor(Math.random() * 51);

      /* ═══ Download all images in parallel ═══ */
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
      grad.addColorStop(0, "#ff9a9e");
      grad.addColorStop(0.5, "#fecfef");
      grad.addColorStop(1, "#a18cd1");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      /* Decorative small hearts (drawn, not emoji) */
      for (let i = 0; i < 10; i++) {
        const x = 50 + Math.random() * (W - 100);
        const y = 40 + Math.random() * (H - 80);
        const s = 20 + Math.random() * 15;
        const colors = ["#ff4d88", "#ff88aa", "#ff2266", "#ffb3cc"];
        const c = colors[Math.floor(Math.random() * colors.length)];
        drawHeart(ctx, x, y, s, c);
      }

      /* Title bar */
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillRect(W / 2 - 220, 20, 440, 70);
      ctx.fillStyle = "#ff2266";
      ctx.font = "bold 42px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LOVE MATCH", W / 2, 70);

      /* Anime images */
      await drawAnime(ctx, animeBoy, 60, 110, 280, 380);
      await drawAnime(ctx, animeGirl, W - 60 - 280, 110, 280, 380);

      /* Big heart in center */
      drawHeart(ctx, W / 2, 240, 100, "#ff2266");
      drawHeart(ctx, W / 2 - 10, 230, 80, "#ff5588");

      /* Love % in center */
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 76px sans-serif";
      ctx.strokeStyle = "#ff2266";
      ctx.lineWidth = 6;
      ctx.textAlign = "center";
      ctx.strokeText(`${lovePct}%`, W / 2, 300);
      ctx.fillText(`${lovePct}%`, W / 2, 300);

      /* FB avatars */
      await drawCircleAvatar(ctx, boyPP, 200, 540, 75);
      await drawCircleAvatar(ctx, girlPP, W - 200, 540, 75);

      /* Names */
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px sans-serif";
      ctx.strokeStyle = "#ff2266";
      ctx.lineWidth = 5;
      ctx.textAlign = "center";

      const boyName = String(boy.name).split(" ")[0].slice(0, 15);
      const girlName = String(girl.name).split(" ")[0].slice(0, 15);

      ctx.strokeText(boyName, 200, 660);
      ctx.fillText(boyName, 200, 660);
      ctx.strokeText(girlName, W - 200, 660);
      ctx.fillText(girlName, W - 200, 660);

      /* Match message */
      ctx.fillStyle = "#ffffff";
      ctx.font = "italic bold 30px sans-serif";
      const msg = lovePct >= 85 ? "Perfect Match!"
                : lovePct >= 70 ? "Great Chemistry!"
                : lovePct >= 55 ? "Good Match!"
                : "Try Harder!";
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
      console.error("[pair] stack:", e.stack);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 80)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1