/**
 * commands/economy/rank.js
 * NEXUS BOT V1 — Global Premium Rank Card v9
 * Global economy: coins/XP/level shared across ALL groups
 * © 2026
 */

"use strict";

const { createCanvas, loadImage } = require("@napi-rs/canvas");
const axios = require("axios");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
fs.ensureDirSync(DATA_DIR);
const RANK_FILE = path.join(DATA_DIR, "rank.json");

const AVATAR_TOKEN = "6628568379|c1e620fa708a1d5696fb991c1bde5662";

/* ═══════════════════════════════════════════════════════════════════
   TIERS (7 — new DIVINE GOD on top)
   ═══════════════════════════════════════════════════════════════════ */
const TIERS = [
  { min: 150, name: "DIVINE GOD",      emoji: "⚡", c1: "#ffd700", c2: "#ffffff", c3: "#ff00ff", rainbow: true,  divine: true, tagline: "Ascended Beyond Mortals" },
  { min: 100, name: "INFINITY LEGEND", emoji: "🌈", c1: "#ff00ff", c2: "#00ffff", c3: "#FFD700", rainbow: true,  tagline: "Beyond Limit" },
  { min: 76,  name: "MYTHIC",          emoji: "🌟", c1: "#ff00aa", c2: "#ff66ff", c3: "#ff00ff", tagline: "Mythical Being" },
  { min: 51,  name: "VIP GOLD",        emoji: "👑", c1: "#FFD700", c2: "#FFA500", c3: "#FF8C00", tagline: "Elite Member" },
  { min: 26,  name: "EPIC",            emoji: "🔥", c1: "#ffea00", c2: "#ff6a00", c3: "#ff3300", tagline: "On Fire!" },
  { min: 11,  name: "RARE",            emoji: "💎", c1: "#00d9ff", c2: "#7b5cff", c3: "#0096c7", tagline: "Rare Achiever" },
  { min: 1,   name: "NORMAL",          emoji: "⭐", c1: "#a8b8d0", c2: "#7b8fa8", c3: "#d0dae8", tagline: "Keep Going!" }
];

function getTier(level) {
  for (const t of TIERS) if (level >= t.min) return t;
  return TIERS[TIERS.length - 1];
}

/* ═══════════════════════════════════════════════════════════════════
   DATA LOAD (with migration from old per-group format)
   ═══════════════════════════════════════════════════════════════════ */
function loadRankData() {
  let raw = null;
  try {
    raw = fs.readJsonSync(RANK_FILE);
  } catch (_) {
    return { users: {} };
  }
  if (!raw || typeof raw !== "object") return { users: {} };

  /* New format check */
  if (raw.users && typeof raw.users === "object") return raw;

  /* Old format — migrate */
  console.log("[rank] migrating old per-group data → global");
  const migrated = { users: {} };
  for (const tid of Object.keys(raw)) {
    const users = raw[tid] || {};
    if (typeof users !== "object") continue;
    for (const uid of Object.keys(users)) {
      const u = users[uid];
      if (!u || typeof u !== "object") continue;
      if (!migrated.users[uid]) {
        migrated.users[uid] = { exp: 0, level: 1, msgs: 0, groups: {} };
      }
      const m = migrated.users[uid];
      m.msgs += Number(u.msgs) || 0;
      m.exp  += Number(u.exp)  || 0;
      m.level = Math.max(m.level, Number(u.level) || 1);
      m.groups[tid] = {
        msgs:  Number(u.msgs)  || 0,
        exp:   Number(u.exp)   || 0,
        level: Number(u.level) || 1
      };
    }
  }

  try {
    fs.writeJsonSync(RANK_FILE + ".old", raw);
    fs.writeJsonSync(RANK_FILE, migrated);
    console.log("[rank] migration complete");
  } catch (e) {
    console.error("[rank] migrate save:", e.message);
  }
  return migrated;
}

function saveRankData(d) {
  try {
    fs.writeJsonSync(RANK_FILE, d);
  } catch (e) {
    console.error("[rank]", e.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   RANK CALCULATORS
   ═══════════════════════════════════════════════════════════════════ */
function calcGlobalRank(data, uid) {
  const arr = Object.entries(data.users || {})
    .map(([id, u]) => ({
      id,
      level: u.level || 1,
      exp: u.exp || 0,
      msgs: u.msgs || 0
    }))
    .sort((a, b) => (b.level - a.level) || (b.exp - a.exp) || (b.msgs - a.msgs));
  const pos = arr.findIndex((u) => u.id === uid) + 1;
  return { rank: pos || 0, total: arr.length };
}

function calcServerRank(data, tid, uid) {
  const tidS = String(tid);
  const arr = Object.entries(data.users || {})
    .filter(([, u]) => u.groups && u.groups[tidS])
    .map(([id, u]) => {
      const g = u.groups[tidS];
      return {
        id,
        level: g.level || 1,
        exp: g.exp || 0,
        msgs: g.msgs || 0
      };
    })
    .sort((a, b) => (b.level - a.level) || (b.exp - a.exp) || (b.msgs - a.msgs));
  const pos = arr.findIndex((u) => u.id === uid) + 1;
  return { rank: pos || 0, total: arr.length };
}

/* ═══════════════════════════════════════════════════════════════════
   LOAD AVATAR
   ═══════════════════════════════════════════════════════════════════ */
async function loadAvatar(userID) {
  const urls = [
    `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=${AVATAR_TOKEN}`,
    `https://graph.facebook.com/${userID}/picture?width=512&height=512&type=large`
  ];
  for (const url of urls) {
    try {
      const r = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 12000,
        maxRedirects: 5,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const buf = Buffer.from(r.data);
      if (buf.length < 500) continue;
      return await loadImage(buf);
    } catch (_) {}
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */
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

function hexToRGBA(hex, a) {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  } catch (_) {
    return `rgba(255,255,255,${a})`;
  }
}

function tierGrad(ctx, x1, y1, x2, y2, tier, alpha = 1) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  if (tier.rainbow) {
    g.addColorStop(0,    `rgba(255,0,255,${alpha})`);
    g.addColorStop(0.25, `rgba(0,200,255,${alpha})`);
    g.addColorStop(0.5,  `rgba(0,255,136,${alpha})`);
    g.addColorStop(0.75, `rgba(255,234,0,${alpha})`);
    g.addColorStop(1,    `rgba(255,0,128,${alpha})`);
  } else {
    g.addColorStop(0, hexToRGBA(tier.c1, alpha));
    g.addColorStop(0.5, hexToRGBA(tier.c2, alpha));
    g.addColorStop(1, hexToRGBA(tier.c3, alpha));
  }
  return g;
}

function drawSparkle(ctx, x, y, s, color, blur = 15) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x + s * 0.15, y - s * 0.15, x + s, y);
  ctx.quadraticCurveTo(x + s * 0.15, y + s * 0.15, x, y + s);
  ctx.quadraticCurveTo(x - s * 0.15, y + s * 0.15, x - s, y);
  ctx.quadraticCurveTo(x - s * 0.15, y - s * 0.15, x, y - s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function fmtNum(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n || 0);
}

/* ═══════════════════════════════════════════════════════════════════
   CARD GENERATOR — PREMIUM v9
   ═══════════════════════════════════════════════════════════════════ */
async function generateRankCard(o) {
  const {
    userName = "User",
    userAvatar = null,
    level = 1,
    exp = 0,
    expNeeded = 10000,
    msgs = 0,
    coins = 0,
    globalRank = 0,
    globalTotal = 0,
    serverRank = 0,
    serverTotal = 0
  } = o;

  const tier = getTier(level);
  const isMax = level >= 150;
  const W = 1400;
  const H = 640;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  /* ══════ BACKGROUND ══════ */
  ctx.fillStyle = "#05020c";
  ctx.fillRect(0, 0, W, H);

  /* Tier ambient orbs */
  const orbs = [
    { x: 260, y: 100, r: 750, c: tier.c1, a: 0.20 },
    { x: 1150, y: 520, r: 800, c: tier.c2, a: 0.16 },
    { x: 700, y: 320, r: 500, c: tier.c3, a: 0.10 }
  ];
  for (const orb of orbs) {
    const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
    g.addColorStop(0, hexToRGBA(orb.c, orb.a));
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /* Star particles */
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = Math.random() * 1.6 + 0.3;
    ctx.fillStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.45})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Big sparkles */
  drawSparkle(ctx, 90, 100, 9, tier.c1, 22);
  drawSparkle(ctx, W - 110, 90, 11, tier.c2, 24);
  drawSparkle(ctx, 105, H - 90, 8, tier.c3, 18);
  drawSparkle(ctx, W - 95, H - 100, 10, "#ffffff", 20);

  /* Divine aura rays (top tier) */
  if (tier.divine) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      const r1 = 180;
      const r2 = 700;
      const cx = 200, cy = 340;
      ctx.strokeStyle = i % 2 === 0 ? hexToRGBA(tier.c1, 0.5) : hexToRGBA(tier.c2, 0.3);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ══════ BORDER ══════ */
  ctx.save();
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 35;
  ctx.strokeStyle = tierGrad(ctx, 0, 0, W, H, tier);
  ctx.lineWidth = 6;
  roundRect(ctx, 16, 16, W - 32, H - 32, 36);
  ctx.stroke();
  ctx.restore();

  /* Inner subtle border */
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 34, 34, W - 68, H - 68, 28);
  ctx.stroke();

  /* ══════ HEADER BAR (tier badge + rank badges) ══════ */
  const HX = 55, HY = 55, HW = W - 110, HH = 82;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  roundRect(ctx, HX, HY, HW, HH, 22);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = hexToRGBA(tier.c1, 0.35);
  ctx.lineWidth = 1.5;
  roundRect(ctx, HX, HY, HW, HH, 22);
  ctx.stroke();

  /* Tier badge text (left) */
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  ctx.font = "bold 38px Georgia, serif";
  ctx.fillStyle = tier.rainbow ? tierGrad(ctx, 90, HY, 500, HY, tier) : tier.c1;
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 16;
  ctx.fillText(`${tier.emoji} ${tier.name}`, 85, HY + HH / 2 - 6);
  ctx.shadowBlur = 0;

  ctx.font = "italic 15px Georgia, serif";
  ctx.fillStyle = hexToRGBA(tier.c1, 0.75);
  ctx.fillText(tier.tagline, 88, HY + HH / 2 + 24);

  /* Rank badges (right) — GLOBAL + SERVER */
  const badgeW = 200;
  const badgeH = 62;
  const badgeY = HY + (HH - badgeH) / 2;
  const badgeGap = 15;

  /* — GLOBAL RANK — */
  const gbX = W - 55 - badgeW * 2 - badgeGap - 20;
  drawRankBadge(ctx, gbX, badgeY, badgeW, badgeH, "🌍", "GLOBAL", globalRank, globalTotal, tier);

  /* — SERVER RANK — */
  const sbX = W - 55 - badgeW - 20;
  drawRankBadge(ctx, sbX, badgeY, badgeW, badgeH, "👥", "SERVER", serverRank, serverTotal, tier);

  /* ══════ AVATAR ══════ */
  const avX = 200;
  const avY = 350;
  const avR = 95;

  /* Outer aura */
  const aura = ctx.createRadialGradient(avX, avY, avR * 0.6, avX, avY, avR * 2.8);
  aura.addColorStop(0, hexToRGBA(tier.c1, 0.55));
  aura.addColorStop(0.5, hexToRGBA(tier.c2, 0.20));
  aura.addColorStop(1, "transparent");
  ctx.fillStyle = aura;
  ctx.fillRect(avX - avR * 3, avY - avR * 3, avR * 6, avR * 6);

  /* Rotating halo ring */
  ctx.save();
  ctx.strokeStyle = hexToRGBA(tier.c1, 0.35);
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.arc(avX, avY, avR + 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  /* Outer glow ring */
  ctx.save();
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 30;
  ctx.strokeStyle = tierGrad(ctx, avX - avR, avY - avR, avX + avR, avY + avR, tier);
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(avX, avY, avR + 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  /* Inner white ring */
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.stroke();

  /* Avatar image */
  if (userAvatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(avX, avY, avR - 3, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    const ratio = userAvatar.width / userAvatar.height;
    let dw = avR * 2, dh = avR * 2;
    if (ratio > 1) { dh = avR * 2; dw = dh * ratio; }
    else { dw = avR * 2; dh = dw / ratio; }
    ctx.drawImage(userAvatar, avX - dw / 2, avY - dh / 2, dw, dh);
    ctx.restore();
  } else {
    ctx.fillStyle = "#181828";
    ctx.beginPath();
    ctx.arc(avX, avY, avR - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "bold 70px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((userName[0] || "?").toUpperCase(), avX, avY + 5);
  }

  /* Crown for tier >= VIP */
  if (level >= 51) {
    ctx.font = "bold 52px Georgia, serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 26;
    ctx.fillText(level >= 100 ? "⚜️" : "👑", avX, avY - avR - 28);
    ctx.shadowBlur = 0;
  }

  /* Sparkles around avatar */
  drawSparkle(ctx, avX - avR - 22, avY - 30, 7, tier.c1, 16);
  drawSparkle(ctx, avX + avR + 22, avY + 30, 7, tier.c2, 16);

  /* ══════ NAME + SUBTITLE ══════ */
  const infoX = 340;

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  ctx.save();
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 22;
  ctx.font = "bold 52px Georgia, serif";
  ctx.fillStyle = "#ffffff";
  const displayName = String(userName).slice(0, 22);
  ctx.fillText(displayName, infoX, 195);
  ctx.restore();

  ctx.font = "italic 20px Georgia, serif";
  ctx.fillStyle = tier.rainbow
    ? tierGrad(ctx, infoX, 0, infoX + 400, 0, tier)
    : hexToRGBA(tier.c1, 0.9);
  ctx.fillText(`${tier.emoji} ${tier.name} • ${tier.tagline}`, infoX, 235);

  /* ══════ STAT CARDS ══════ */
  const statsAreaX = infoX;
  const statsAreaW = W - statsAreaX - 55;
  const cardGap = 18;
  const cardW = Math.floor((statsAreaW - cardGap * 3) / 4);
  const cardH = 118;
  const statsY = 285;

  const stats = [
    { label: "LEVEL",    value: isMax ? "∞" : String(level),                  icon: "🎯", color: tier.c1 },
    { label: "MESSAGES", value: fmtNum(msgs),                                  icon: "💬", color: tier.c2 },
    { label: "COINS",    value: fmtNum(coins),                                 icon: "🪙", color: "#ffd700" },
    { label: "XP RATE",  value: isMax ? "MAX" : `${Math.floor((exp / expNeeded) * 100)}%`, icon: "⚡", color: tier.c3 }
  ];

  stats.forEach((s, i) => {
    const cx = statsAreaX + i * (cardW + cardGap);
    const cy = statsY;

    /* Card bg */
    ctx.save();
    ctx.fillStyle = "rgba(12, 10, 22, 0.78)";
    roundRect(ctx, cx, cy, cardW, cardH, 18);
    ctx.fill();
    ctx.restore();

    /* Card border */
    ctx.strokeStyle = hexToRGBA(s.color, 0.6);
    ctx.lineWidth = 2;
    roundRect(ctx, cx, cy, cardW, cardH, 18);
    ctx.stroke();

    /* Top accent bar */
    ctx.fillStyle = hexToRGBA(s.color, 0.85);
    roundRect(ctx, cx + 20, cy + 12, cardW - 40, 3, 2);
    ctx.fill();

    /* Icon */
    ctx.textAlign = "center";
    ctx.font = "22px Georgia, serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(s.icon, cx + cardW / 2, cy + 40);

    /* Value */
    ctx.font = "bold 34px Georgia, serif";
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 14;
    ctx.fillText(s.value, cx + cardW / 2, cy + 78);
    ctx.shadowBlur = 0;

    /* Label */
    ctx.font = "bold 11px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(s.label, cx + cardW / 2, cy + 102);
  });

  /* ══════ XP PROGRESS BAR ══════ */
  const pbX = infoX;
  const pbY = 435;
  const pbW = W - infoX - 55;
  const pbH = 44;

  /* Bar bg */
  ctx.save();
  ctx.fillStyle = "rgba(8, 6, 16, 0.92)";
  roundRect(ctx, pbX, pbY, pbW, pbH, pbH / 2);
  ctx.fill();
  ctx.restore();

  /* Bar border */
  ctx.strokeStyle = hexToRGBA(tier.c1, 0.65);
  ctx.lineWidth = 2;
  roundRect(ctx, pbX, pbY, pbW, pbH, pbH / 2);
  ctx.stroke();

  /* Fill */
  const pct = isMax ? 1 : Math.min(1, exp / expNeeded);
  const fillW = Math.max(pct * (pbW - 6), 0);
  if (fillW > 5) {
    ctx.save();
    ctx.shadowColor = tier.c1;
    ctx.shadowBlur = 24;
    ctx.fillStyle = tierGrad(ctx, pbX, pbY, pbX + pbW, pbY, tier);
    roundRect(ctx, pbX + 3, pbY + 3, fillW, pbH - 6, (pbH - 6) / 2);
    ctx.fill();
    ctx.restore();
  }

  /* Segment ticks (every 25%) */
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    const x = pbX + (pbW * i / 4);
    ctx.beginPath();
    ctx.moveTo(x, pbY + 6);
    ctx.lineTo(x, pbY + pbH - 6);
    ctx.stroke();
  }

  /* Progress text */
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 17px Georgia, serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#000";
  ctx.shadowBlur = 8;
  const progText = isMax
    ? "∞  MAX LEVEL  ∞"
    : `${exp.toLocaleString()} / ${expNeeded.toLocaleString()} XP  •  ${Math.floor(pct * 100)}%`;
  ctx.fillText(progText, pbX + pbW / 2, pbY + pbH / 2 + 1);
  ctx.shadowBlur = 0;

  /* ══════ FOOTER ══════ */
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 18px Georgia, serif";
  ctx.fillStyle = tier.rainbow
    ? tierGrad(ctx, W / 2 - 300, 0, W / 2 + 300, 0, tier)
    : hexToRGBA(tier.c1, 0.95);
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 16;
  const footer = isMax
    ? "⚡  DIVINE GOD — The Ascended One  ⚡"
    : `${tier.emoji}  ${tier.name}  ${tier.emoji}`;
  ctx.fillText(footer, W / 2, H - 75);
  ctx.shadowBlur = 0;

  ctx.textAlign = "right";
  ctx.font = "italic 13px Georgia, serif";
  ctx.fillStyle = hexToRGBA(tier.c1, 0.6);
  ctx.fillText("NEXUS BOT V1", W - 60, H - 38);

  ctx.textAlign = "left";
  ctx.fillText("Powered by Ariyan Shihab", 60, H - 38);

  return canvas.encode("png");
}

/* ═══════════════════════════════════════════════════════════════════
   RANK BADGE HELPER
   ═══════════════════════════════════════════════════════════════════ */
function drawRankBadge(ctx, x, y, w, h, icon, label, rank, total, tier) {
  /* BG */
  ctx.save();
  ctx.fillStyle = "rgba(8, 6, 18, 0.9)";
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.restore();

  /* Border */
  ctx.strokeStyle = tierGrad(ctx, x, y, x + w, y, tier);
  ctx.lineWidth = 2.5;
  roundRect(ctx, x, y, w, h, 16);
  ctx.stroke();

  /* Label top */
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "bold 11px Arial, sans-serif";
  ctx.fillStyle = hexToRGBA(tier.c1, 0.85);
  ctx.fillText(`${icon} ${label}`, x + 14, y + 18);

  /* Rank value */
  ctx.textAlign = "right";
  ctx.font = "bold 26px Georgia, serif";
  ctx.fillStyle = tier.rainbow
    ? tierGrad(ctx, x, 0, x + w, 0, tier)
    : tier.c1;
  ctx.shadowColor = tier.c1;
  ctx.shadowBlur = 12;
  ctx.fillText(rank > 0 ? `#${rank}` : "—", x + w - 14, y + h - 24);
  ctx.shadowBlur = 0;

  /* Total */
  ctx.textAlign = "right";
  ctx.font = "italic 11px Georgia, serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(`/ ${total}`, x + w - 14, y + h - 8);
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════════════ */
module.exports = {
  name: "rank",
  aliases: ["myrank", "rankcard", "card"],
  version: "9.0.0",
  role: 0,
  description: "Global rank card (shared across all groups)",
  usage: "/rank [@user]",
  category: "economy",

  execute: async function (api, event, args, db, config) {
    const { threadID, senderID, mentions, messageReply, messageID } = event;
    let tmpPath = null;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };
    react("⏳");

    try {
      /* Pick target user */
      let target = String(senderID);
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);

      /* Load global rank data */
      const data = loadRankData();
      if (!data.users) data.users = {};
      if (!data.users[target]) {
        data.users[target] = { exp: 0, level: 1, msgs: 0, groups: {} };
      }
      const user = data.users[target];
      if (!user.groups) user.groups = {};

      /* Track activity (only self) */
      if (target === String(senderID)) {
        const tidS = String(threadID);

        /* Global increment */
        user.msgs = (user.msgs || 0) + 1;
        user.exp  = (user.exp  || 0) + 15;

        /* Group increment */
        if (!user.groups[tidS]) {
          user.groups[tidS] = { msgs: 0, exp: 0, level: 1 };
        }
        user.groups[tidS].msgs = (user.groups[tidS].msgs || 0) + 1;
        user.groups[tidS].exp  = (user.groups[tidS].exp  || 0) + 15;

        /* Global level up */
        while (user.exp >= user.level * 10000 && user.level < 150) {
          user.exp -= user.level * 10000;
          user.level += 1;
        }
        if (user.level >= 150) user.exp = 0;

        /* Server level up */
        const g = user.groups[tidS];
        while (g.exp >= g.level * 10000 && g.level < 150) {
          g.exp -= g.level * 10000;
          g.level += 1;
        }
        if (g.level >= 150) g.exp = 0;

        saveRankData(data);
      }

      /* Ranks */
      const global = calcGlobalRank(data, target);
      const server = calcServerRank(data, threadID, target);

      /* Coins from global users.json (via db.getUser) */
      let coins = 0;
      try {
        const dbUser = await db.getUser(target);
        if (dbUser) coins = (dbUser.balance || 0) + (dbUser.bank || 0);
      } catch (_) {}

      /* Fetch user name */
      let name = "User";
      try {
        const info = await api.getUserInfo(target);
        if (info && info[target] && info[target].name) name = info[target].name;
      } catch (_) {}

      /* Avatar */
      const avatar = await loadAvatar(target);

      /* Render card */
      const buf = await generateRankCard({
        userName: name,
        userAvatar: avatar,
        level: user.level || 1,
        exp: user.exp || 0,
        expNeeded: (user.level || 1) * 10000,
        msgs: user.msgs || 0,
        coins,
        globalRank: global.rank,
        globalTotal: global.total,
        serverRank: server.rank,
        serverTotal: server.total
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
      console.error("[rank] stack:", e.stack);
      react("❌");
      api.sendMessage("❌ Rank card failed: " + e.message.slice(0, 100), threadID);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    }
  }
};

// © 2026 NEXUS BOT V1