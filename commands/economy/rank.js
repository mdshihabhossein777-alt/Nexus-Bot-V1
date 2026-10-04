/**
 * commands/economy/rank.js
 * NEXUS BOT V1 — Premium Rank Card v8
 * © 2026
 */

const { createCanvas, loadImage } = require("@napi-rs/canvas");
const axios = require("axios");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
fs.ensureDirSync(DATA_DIR);
const RANK_FILE = path.join(DATA_DIR, "rank.json");

const AVATAR_TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

/* ═══════════════════════════════════════════════════════════
   TIERS
   ═══════════════════════════════════════════════════════════ */
const TIERS = [
  { min: 100, name: "INFINITY LEGEND", emoji: "🌈", c1: "#ff00ff", c2: "#00ffff", c3: "#FFD700", rainbow: true, tagline: "Beyond Limit", bg1: "#3a0a4a", bg2: "#100028" },
  { min: 76,  name: "MYTHIC",          emoji: "🌟", c1: "#ff00aa", c2: "#ff66ff", c3: "#ff00ff", tagline: "Mythical Being", bg1: "#3a0a2a", bg2: "#180010" },
  { min: 51,  name: "VIP GOLD",        emoji: "👑", c1: "#FFD700", c2: "#FFA500", c3: "#FF8C00", tagline: "Elite Member", bg1: "#3a2a08", bg2: "#181000" },
  { min: 26,  name: "EPIC",            emoji: "🔥", c1: "#ffea00", c2: "#ff6a00", c3: "#ff3300", tagline: "On Fire!", bg1: "#3a1505", bg2: "#180800" },
  { min: 11,  name: "RARE",            emoji: "💎", c1: "#00d9ff", c2: "#7b5cff", c3: "#0096c7", tagline: "Rare Achiever", bg1: "#082030", bg2: "#000a18" },
  { min: 1,   name: "NORMAL",          emoji: "⭐", c1: "#a8b8d0", c2: "#7b8fa8", c3: "#d0dae8", tagline: "Keep Going!", bg1: "#1a2030", bg2: "#08080f" }
];

function getTier(level) {
  for (const t of TIERS) if (level >= t.min) return t;
  return TIERS[TIERS.length - 1];
}

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */
function loadRankData() {
  try { return fs.readJsonSync(RANK_FILE) || {}; } catch (_) { return {}; }
}
function saveRankData(d) {
  try { fs.writeJsonSync(RANK_FILE, d); } catch (e) { console.error("[rank]", e.message); }
}

/* ═══════════════════════════════════════════════════════════
   LOAD AVATAR
   ═══════════════════════════════════════════════════════════ */
async function loadAvatar(userID) {
  try {
    const url = `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=${AVATAR_TOKEN}`;
    const r = await axios.get(url, { responseType: "arraybuffer", timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } });
    return await loadImage(Buffer.from(r.data));
  } catch (_) { return null; }
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
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

function tierGrad(ctx, x1, y1, x2, y2, tier, alpha = 1) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  if (tier.rainbow) {
    g.addColorStop(0,    `rgba(255, 0, 255, ${alpha})`);
    g.addColorStop(0.25, `rgba(0, 200, 255, ${alpha})`);
    g.addColorStop(0.5,  `rgba(0, 255, 136, ${alpha})`);
    g.addColorStop(0.75, `rgba(255, 234, 0, ${alpha})`);
    g.addColorStop(1,    `rgba(255, 0, 128, ${alpha})`);
  } else {
    g.addColorStop(0, tier.c1);
    g.addColorStop(0.5, tier.c2);
    g.addColorStop(1, tier.c3);
  }
  return g;
}

function hexToRGBA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawSparkle(ctx, x, y, size, color = "#ffffff", blur = 15) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.15, y - size * 0.15, x + size, y);
  ctx.quadraticCurveTo(x + size * 0.15, y + size * 0.15, x, y + size);
  ctx.quadraticCurveTo(x - size * 0.15, y + size * 0.15, x - size, y);
  ctx.quadraticCurveTo(x - size * 0.15, y - size * 0.15, x, y - size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════
   MAIN — Generate Card
   ═══════════════════════════════════════════════════════════ */
async function generateRankCard(opts) {
  const {
    userName = "User",
    userAvatar = null,
    level = 1,
    exp = 0,
    expNeeded = 10000,
    msgs = 0,
    rank = 0,      /* position in leaderboard */
    total = 0      /* total users in leaderboard */
  } = opts;

  const tier = getTier(level);
  const isMax = level >= 100;
  const isRainbow = tier.rainbow;

  const W = 1200;
  const H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  /* ══════ BACKGROUND ══════ */
  ctx.fillStyle = "#050509";
  ctx.fillRect(0, 0, W, H);

  /* Tier glow */
  const bgG = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W * 0.75);
  bgG.addColorStop(0, tier.bg1);
  bgG.addColorStop(0.5, tier.bg2);
  bgG.addColorStop(1, "#050509");
  ctx.fillStyle = bgG;
  ctx.fillRect(0, 0, W, H);

  /* Ambient sparkles */
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const s = 1 + Math.random() * 2.5;
    ctx.fillStyle = hexToRGBA(tier.c1, 0.4 + Math.random() * 0.4);
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Big sparkles */
  drawSparkle(ctx, 80, 90, 8, tier.c1, 18);
  drawSparkle(ctx, W - 100, 80, 10, tier.c2, 20);
  drawSparkle(ctx, 100, H - 80, 7, tier.c3, 15);
  drawSparkle(ctx, W - 90, H - 90, 9, "#ffffff", 18);

  /* ══════ BORDER ══════ */
  ctx.save();
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 25;
  ctx.strokeStyle = tierGrad(ctx, 0, 0, W, H, tier);
  ctx.lineWidth = 5;
  roundRect(ctx, 14, 14, W - 28, H - 28, 28);
  ctx.stroke();
  ctx.restore();

  /* Inner border */
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 26, 26, W - 52, H - 52, 22);
  ctx.stroke();

  /* ══════ TOP LEFT — USERNAME ══════ */
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  /* Display name (large) */
  ctx.save();
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 20;
  ctx.font = "bold 38px Georgia, serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(userName.slice(0, 22), 220, 75);
  ctx.restore();

  /* Subtext — tier name */
  ctx.font = "italic 18px Georgia, serif";
  ctx.fillStyle = isRainbow
    ? tierGrad(ctx, 220, 0, 600, 0, tier)
    : hexToRGBA(tier.c1, 0.9);
  ctx.fillText(`${tier.emoji} ${tier.name} — ${tier.tagline}`, 220, 108);

  /* ══════ TOP RIGHT — RANK BADGE ══════ */
  if (rank > 0 && total > 0) {
    const bX = W - 240;
    const bY = 40;
    const bW = 190;
    const bH = 75;

    /* Background */
    ctx.save();
    ctx.shadowColor = tier.c1;
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(10, 10, 20, 0.85)";
    roundRect(ctx, bX, bY, bW, bH, 18);
    ctx.fill();
    ctx.restore();

    /* Border */
    ctx.strokeStyle = tierGrad(ctx, bX, bY, bX + bW, bY, tier);
    ctx.lineWidth = 2.5;
    roundRect(ctx, bX, bY, bW, bH, 18);
    ctx.stroke();

    /* Label */
    ctx.textAlign = "center";
    ctx.font = "bold 14px Sans";
    ctx.fillStyle = hexToRGBA(tier.c1, 0.85);
    ctx.fillText("RANK", bX + bW / 2, bY + 22);

    /* Number */
    ctx.font = "bold 42px Georgia, serif";
    ctx.fillStyle = isRainbow
      ? tierGrad(ctx, bX, 0, bX + bW, 0, tier)
      : tier.c1;
    ctx.shadowColor = tier.c1;
    ctx.shadowBlur = 18;
    ctx.fillText(`#${rank}`, bX + bW / 2, bY + 55);
    ctx.shadowBlur = 0;
  }

  /* ══════ AVATAR (Left Side) ══════ */
  const avX = 120;
  const avY = 190;
  const avR = 72;

  /* Outer glow */
  const avGlow = ctx.createRadialGradient(avX, avY, avR * 0.5, avX, avY, avR * 2.5);
  avGlow.addColorStop(0, hexToRGBA(tier.c1, 0.5));
  avGlow.addColorStop(0.5, hexToRGBA(tier.c2, 0.15));
  avGlow.addColorStop(1, "transparent");
  ctx.fillStyle = avGlow;
  ctx.fillRect(avX - avR * 3, avY - avR * 3, avR * 6, avR * 6);

  /* Avatar ring */
  ctx.save();
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 25;
  ctx.strokeStyle = tierGrad(ctx, avX - avR, avY - avR, avX + avR, avY + avR, tier);
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(avX, avY, avR + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  /* Inner white ring */
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.stroke();

  /* Avatar image */
  if (userAvatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(avX, avY, avR - 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const ratio = userAvatar.width / userAvatar.height;
    let dw = avR * 2, dh = avR * 2;
    if (ratio > 1) dh = avR * 2, dw = dh * ratio;
    else dw = avR * 2, dh = dw / ratio;
    ctx.drawImage(userAvatar, avX - dw / 2, avY - dh / 2, dw, dh);
    ctx.restore();
  } else {
    ctx.fillStyle = "#1a1a30";
    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Crown for high tiers */
  if (level >= 51) {
    ctx.font = "bold 48px Sans";
    ctx.textAlign = "center";
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 25;
    ctx.fillText("👑", avX, avY - avR - 25);
    ctx.shadowBlur = 0;
  }

  /* Sparkles around avatar */
  drawSparkle(ctx, avX - avR - 15, avY - 20, 5, tier.c1, 12);
  drawSparkle(ctx, avX + avR + 15, avY + 20, 5, tier.c2, 12);

  /* ══════ INFO CARDS (Right side of avatar) ══════ */
  const infoX = 260;
  const infoY = 150;
  const cardW = 130;
  const cardH = 100;
  const gap = 18;

  const stats = [
    { label: "LEVEL", value: isMax ? "∞" : String(level),       icon: "🎯", color: tier.c1 },
    { label: "MESSAGES", value: msgs > 999999 ? (msgs / 1000000).toFixed(1) + "M" : msgs > 999 ? (msgs / 1000).toFixed(1) + "K" : String(msgs), icon: "💬", color: tier.c2 },
    { label: "XP", value: isMax ? "MAX" : `${Math.floor((exp / expNeeded) * 100)}%`, icon: "⚡", color: tier.c3 }
  ];

  stats.forEach((s, i) => {
    const cx = infoX + i * (cardW + gap);
    const cy = infoY;

    /* Card bg */
    ctx.save();
    ctx.fillStyle = "rgba(15, 12, 25, 0.75)";
    roundRect(ctx, cx, cy, cardW, cardH, 16);
    ctx.fill();
    ctx.restore();

    /* Card border (top accent) */
    ctx.strokeStyle = hexToRGBA(s.color, 0.7);
    ctx.lineWidth = 2;
    roundRect(ctx, cx, cy, cardW, cardH, 16);
    ctx.stroke();

    /* Icon */
    ctx.textAlign = "center";
    ctx.font = "22px Sans";
    ctx.fillText(s.icon, cx + cardW / 2, cy + 26);

    /* Value */
    ctx.font = "bold 30px Georgia, serif";
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 12;
    ctx.fillText(s.value, cx + cardW / 2, cy + 60);
    ctx.shadowBlur = 0;

    /* Label */
    ctx.font = "bold 11px Sans";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(s.label, cx + cardW / 2, cy + 85);
  });

  /* ══════ PROGRESS BAR ══════ */
  const pbX = 60;
  const pbY = 320;
  const pbW = W - 120;
  const pbH = 34;

  /* Progress bar background */
  ctx.save();
  ctx.fillStyle = "rgba(10, 8, 18, 0.85)";
  roundRect(ctx, pbX, pbY, pbW, pbH, pbH / 2);
  ctx.fill();
  ctx.restore();

  /* Progress bar border */
  ctx.strokeStyle = hexToRGBA(tier.c1, 0.6);
  ctx.lineWidth = 2;
  roundRect(ctx, pbX, pbY, pbW, pbH, pbH / 2);
  ctx.stroke();

  /* Progress fill */
  const pct = isMax ? 1 : Math.min(1, exp / expNeeded);
  const fillW = Math.max(pct * (pbW - 6), 0);

  if (fillW > 5) {
    ctx.save();
    ctx.shadowColor = tier.c1;
    ctx.shadowBlur = 20;
    ctx.fillStyle = tierGrad(ctx, pbX, pbY, pbX + pbW, pbY, tier);
    roundRect(ctx, pbX + 3, pbY + 3, fillW, pbH - 6, (pbH - 6) / 2);
    ctx.fill();
    ctx.restore();
  }

  /* Progress text (centered) */
  ctx.textAlign = "center";
  ctx.font = "bold 16px Sans";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#000";
  ctx.shadowBlur = 8;
  const progText = isMax
    ? "∞ MAX LEVEL ∞"
    : `${exp.toLocaleString()} / ${expNeeded.toLocaleString()} XP  •  ${Math.floor(pct * 100)}%`;
  ctx.fillText(progText, pbX + pbW / 2, pbY + pbH / 2 + 2);
  ctx.shadowBlur = 0;

  /* ══════ FOOTER ══════ */
  ctx.textAlign = "center";
  ctx.font = "bold 20px Georgia, serif";
  ctx.fillStyle = isRainbow
    ? tierGrad(ctx, W / 2 - 300, 0, W / 2 + 300, 0, tier)
    : hexToRGBA(tier.c1, 0.95);
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 15;
  const footer = isMax
    ? "∞  INFINITY LEGEND — Beyond Limit  ∞"
    : `${tier.emoji}  ${tier.name}  ${tier.emoji}`;
  ctx.fillText(footer, W / 2, H - 75);
  ctx.shadowBlur = 0;

  /* Branding */
  ctx.textAlign = "right";
  ctx.font = "italic 13px Georgia, serif";
  ctx.fillStyle = hexToRGBA(tier.c1, 0.6);
  ctx.fillText("NEXUS BOT V1", W - 50, H - 40);

  ctx.textAlign = "left";
  ctx.fillText("Powered by Ariyan Shihab", 50, H - 40);

  return canvas.encode("png");
}

/* ═══════════════════════════════════════════════════════════
   MAIN MODULE
   ═══════════════════════════════════════════════════════════ */
module.exports = {
  name: "rank",
  aliases: ["myrank", "rankcard", "card"],
  version: "8.0.0",
  role: 0,
  description: "Show your premium rank card",
  usage: "/rank [@user]",
  category: "economy",

  execute: async function (api, event, args, db, config) {
    const { threadID, senderID, mentions, messageReply, messageID } = event;
    let tmpPath = null;

    const react = (e) => { if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {} };
    react("⏳");

    try {
      let target = String(senderID);
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);

      const data = loadRankData();
      if (!data[threadID]) data[threadID] = {};
      if (!data[threadID][target]) data[threadID][target] = { exp: 0, level: 1, msgs: 0 };

      const user = data[threadID][target];

      /* ═══ Award XP if self ═══ */
      if (target === String(senderID)) {
        user.msgs = (user.msgs || 0) + 1;
        user.exp  = (user.exp  || 0) + 15;

        /* Check level up */
        while (user.exp >= user.level * 10000 && user.level < 100) {
          user.level += 1;
          user.exp -= (user.level - 1) * 10000;
        }
        if (user.level >= 100) user.exp = 0;
        saveRankData(data);
      }

      /* ═══ Calculate rank position ═══ */
      const threadData = data[threadID] || {};
      const sorted = Object.entries(threadData)
        .map(([id, u]) => ({ id, level: u.level || 1, exp: u.exp || 0, msgs: u.msgs || 0 }))
        .sort((a, b) => (b.level - a.level) || (b.exp - a.exp));
      const rank = sorted.findIndex((u) => u.id === target) + 1;
      const total = sorted.length;

      /* ═══ Get username ═══ */
      let name = "User";
      try {
        const info = await api.getUserInfo(target);
        if (info && info[target] && info[target].name) name = info[target].name;
      } catch (_) {}

      const avatar = await loadAvatar(target);

      const buf = await generateRankCard({
        userName: name,
        userAvatar: avatar,
        level: user.level,
        exp: user.exp,
        expNeeded: user.level * 10000,
        msgs: user.msgs || 0,
        rank,
        total
      });

      tmpPath = path.join(os.tmpdir(), `rank_${target}_${Date.now()}.png`);
      await fs.writeFile(tmpPath, buf);

      react("🏆");
      api.sendMessage({
        body: "",
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[rank] error:", e.message);
      react("❌");
      api.sendMessage("❌ Rank card failed: " + e.message.slice(0, 60), threadID);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    }
  }
};

// © 2026 NEXUS BOT V1