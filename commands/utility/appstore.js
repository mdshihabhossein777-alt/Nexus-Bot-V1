/**
 * commands/utility/appstore.js
 * NEXUS BOT V1 — App Store Search v1
 * © 2026
 */

"use strict";

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const TMP_DIR = os.tmpdir();

/* ═══ Fast keep-alive client ═══ */
const https = require("https");
const agent = new https.Agent({ keepAlive: true, maxSockets: 15 });

const client = axios.create({
  timeout: 12000,
  httpsAgent: agent,
  headers: { "User-Agent": "Mozilla/5.0" }
});

/* ═══ Cache (10 min) ═══ */
const cache = new Map();
const TTL = 10 * 60 * 1000;

/* ═══ Search iTunes (iOS App Store) ═══ */
async function searchITunes(name, limit = 5) {
  const r = await client.get("https://itunes.apple.com/search", {
    params: { term: name, media: "software", limit }
  });
  return (r.data?.results || []).filter(a => a && a.trackName);
}

/* ═══ Google Play link (search URL — no scraping needed) ═══ */
function playStoreSearchUrl(name) {
  return `https://play.google.com/store/search?q=${encodeURIComponent(name)}&c=apps`;
}

/* ═══ Fit text to width ═══ */
function fitText(ctx, text, maxWidth, base, min, weight = "bold") {
  let s = base;
  while (s > min) {
    ctx.font = `${weight} ${s}px Arial, 'DejaVu Sans', sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    s -= 2;
  }
  return s;
}

/* ═══ Strip HTML tags from description ═══ */
function stripHtml(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/* ═══ Format bytes ═══ */
function fmtBytes(b) {
  if (!b) return "N/A";
  const mb = b / 1024 / 1024;
  if (mb < 1) return `${(b / 1024).toFixed(0)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

/* ═══ Round rect ═══ */
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

/* ═══ Draw star ═══ */
function drawStar(ctx, cx, cy, r, filled, color = "#FFB400") {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = (Math.PI / 2) * 0 + (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const a2 = a1 + Math.PI / 5;
    ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    ctx.lineTo(cx + Math.cos(a2) * r * 0.45, cy + Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  if (filled) { ctx.fillStyle = color; ctx.fill(); }
  else {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

/* ═══ Get app icon buffer ═══ */
async function fetchIcon(url) {
  try {
    const r = await client.get(url, { responseType: "arraybuffer", timeout: 10000 });
    return Buffer.from(r.data);
  } catch (_) { return null; }
}

/* ═══ Main card renderer ═══ */
async function renderCard(app, platform = "iOS") {
  const W = 1000, H = 560;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  /* Background */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   "#0b0620");
  bg.addColorStop(0.5, "#1a0b3a");
  bg.addColorStop(1,   "#0a0620");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* Ambient glows */
  const g1 = ctx.createRadialGradient(150, 100, 0, 150, 100, 500);
  g1.addColorStop(0, "rgba(138, 43, 226, 0.35)");
  g1.addColorStop(1, "transparent");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W - 100, H - 80, 0, W - 100, H - 80, 500);
  g2.addColorStop(0, "rgba(0, 200, 255, 0.28)");
  g2.addColorStop(1, "transparent");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  const g3 = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 450);
  g3.addColorStop(0, "rgba(255, 215, 0, 0.10)");
  g3.addColorStop(1, "transparent");
  ctx.fillStyle = g3;
  ctx.fillRect(0, 0, W, H);

  /* Particle field */
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    ctx.beginPath();
    ctx.arc(x, y, 0.4 + Math.random() * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.10 + Math.random() * 0.35})`;
    ctx.fill();
  }

  /* Border frame */
  ctx.save();
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 18;
  const bd = ctx.createLinearGradient(0, 0, W, H);
  bd.addColorStop(0,    "#FFD700");
  bd.addColorStop(0.33, "#ff69b4");
  bd.addColorStop(0.66, "#8a2be2");
  bd.addColorStop(1,    "#00ffff");
  ctx.strokeStyle = bd;
  ctx.lineWidth = 3;
  roundRect(ctx, 14, 14, W - 28, H - 28, 22);
  ctx.stroke();
  ctx.restore();

  /* ═══ TOP BAR ═══ */
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 30px Arial, 'DejaVu Sans', sans-serif";
  ctx.fillStyle = "#FFD700";
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 20;
  ctx.fillText("📱  APP STORE", W / 2, 68);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "italic 14px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(`— ${platform} App Info —`, W / 2, 92);
  ctx.restore();

  /* Divider */
  ctx.fillStyle = "rgba(255, 215, 0, 0.35)";
  ctx.fillRect(180, 108, W - 360, 1);

  /* ═══ ICON ═══ */
  const ICON_X = 90, ICON_Y = 150, ICON_S = 200;
  const iconBuf = await fetchIcon(app.artworkUrl512 || app.artworkUrl100 || app.artworkUrl60);

  /* Icon glow */
  ctx.save();
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 30;
  roundRect(ctx, ICON_X, ICON_Y, ICON_S, ICON_S, 36);
  ctx.fillStyle = "#0a0a2a";
  ctx.fill();
  ctx.restore();

  /* Draw icon clipped */
  ctx.save();
  roundRect(ctx, ICON_X, ICON_Y, ICON_S, ICON_S, 36);
  ctx.clip();
  if (iconBuf) {
    try {
      const img = await loadImage(iconBuf);
      ctx.drawImage(img, ICON_X, ICON_Y, ICON_S, ICON_S);
    } catch (_) {
      ctx.fillStyle = "#1a1a3a";
      ctx.fillRect(ICON_X, ICON_Y, ICON_S, ICON_S);
    }
  } else {
    ctx.fillStyle = "#1a1a3a";
    ctx.fillRect(ICON_X, ICON_Y, ICON_S, ICON_S);
  }
  ctx.restore();

  /* Icon border */
  ctx.save();
  roundRect(ctx, ICON_X, ICON_Y, ICON_S, ICON_S, 36);
  ctx.strokeStyle = "rgba(255, 215, 0, 0.7)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  /* ═══ RIGHT SIDE INFO ═══ */
  const RX = 340;
  const RW = W - RX - 70;

  /* App name */
  const nameSize = fitText(ctx, app.trackName || "Unknown", RW, 34, 18);
  ctx.save();
  ctx.textAlign = "left";
  const nameGrad = ctx.createLinearGradient(RX, 160, RX, 200);
  nameGrad.addColorStop(0, "#ffffff");
  nameGrad.addColorStop(1, "#FFD700");
  ctx.font = `bold ${nameSize}px Arial, sans-serif`;
  ctx.fillStyle = nameGrad;
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 12;
  ctx.fillText(app.trackName || "Unknown", RX, 186);
  ctx.restore();

  /* Developer */
  ctx.save();
  ctx.textAlign = "left";
  ctx.font = "16px Arial, sans-serif";
  ctx.fillStyle = "rgba(0, 255, 255, 0.85)";
  ctx.fillText(`👤  ${app.artistName || "Unknown"}`, RX, 216);
  ctx.restore();

  /* Genre + Platform */
  ctx.save();
  ctx.textAlign = "left";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  const genre = (app.primaryGenreName || app.genres?.join(", ") || "App").slice(0, 40);
  ctx.fillText(`🏷️  ${genre}`, RX, 244);
  ctx.restore();

  /* ═══ RATING + STATS ROW ═══ */
  const statY = 282;
  const rating = parseFloat(app.averageUserRating || 0);
  const ratingCount = app.userRatingCount || app.ratingCount || 0;

  /* Stars */
  const starsX = RX + 4;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, starsX + i * 24, statY, 11, i < Math.round(rating));
  }

  ctx.save();
  ctx.textAlign = "left";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillStyle = "#FFB400";
  ctx.fillText(`${rating.toFixed(1)}`, starsX + 5 * 24 + 6, statY + 6);
  ctx.font = "13px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(`(${ratingCount.toLocaleString()})`, starsX + 5 * 24 + 46, statY + 6);
  ctx.restore();

  /* ═══ INFO BOXES (version / size / age / price) ═══ */
  const boxY = 320;
  const boxH = 80;
  const boxW = (RW - 3 * 12) / 4;
  const boxes = [
    { l: "VERSION", v: (app.version || "—").slice(0, 10), c: "#FFD700" },
    { l: "SIZE",    v: fmtBytes(app.fileSizeBytes),       c: "#ff69b4" },
    { l: "AGE",     v: app.contentAdvisoryRating || app.trackContentRating || "4+", c: "#00ffff" },
    { l: "PRICE",   v: app.formattedPrice && app.formattedPrice !== "Get" ? app.formattedPrice : "FREE", c: "#7CFC00" }
  ];

  boxes.forEach((b, i) => {
    const bx = RX + i * (boxW + 12);
    ctx.save();
    roundRect(ctx, bx, boxY, boxW, boxH, 12);
    const bg2 = ctx.createLinearGradient(bx, boxY, bx, boxY + boxH);
    bg2.addColorStop(0, "rgba(255,255,255,0.06)");
    bg2.addColorStop(1, "rgba(255,255,255,0.02)");
    ctx.fillStyle = bg2;
    ctx.fill();

    roundRect(ctx, bx, boxY, boxW, boxH, 12);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "11px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(b.l, bx + boxW / 2, boxY + 24);

    ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillStyle = b.c;
    ctx.fillText(b.v, bx + boxW / 2, boxY + 54);
    ctx.restore();
  });

  /* ═══ DESCRIPTION SNIPPET ═══ */
  const descY = 432;
  const desc = stripHtml(app.description || app.shortDescription || "").slice(0, 140);
  if (desc) {
    ctx.save();
    ctx.textAlign = "left";
    ctx.font = "13px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    /* Wrap text roughly */
    const words = desc.split(" ");
    let line = "", lines = [];
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > RW) {
        lines.push(line);
        line = w;
        if (lines.length === 2) break;
      } else line = test;
    }
    if (line && lines.length < 2) lines.push(line);
    lines.forEach((ln, i) => {
      ctx.fillText(ln + (i === lines.length - 1 && desc.length >= 140 ? "…" : ""), RX, descY + i * 20);
    });
    ctx.restore();
  }

  /* ═══ FOOTER ═══ */
  ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
  ctx.fillRect(200, H - 52, W - 400, 1);

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "12px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("NEXUS BOT V1  •  App Store Search", W / 2, H - 28);
  ctx.restore();

  return canvas.toBuffer("image/png");
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════ */
module.exports = {
  name: "app",
  aliases: ["appstore", "playstore", "android", "ios", "apk"],
  version: "1.0.0",
  role: 0,
  description: "Search any app — icon, rating, link sob",
  usage: "/app <app name>",
  category: "utility",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    const query = (args || []).join(" ").trim();
    if (!query) {
      react("❓");
      return api.sendMessage(
        "📱 Usage: /app <app name>\n\nExample:\n• /app freefire\n• /app whatsapp\n• /app capcut",
        threadID, messageID
      );
    }

    react("⏳");

    try {
      /* ═══ Cache check ═══ */
      const key = query.toLowerCase();
      let app = null;
      const cached = cache.get(key);
      if (cached && Date.now() - cached.t < TTL) {
        app = cached.app;
        console.log("[appstore] cache hit");
      }

      /* ═══ Search iTunes ═══ */
      if (!app) {
        const results = await searchITunes(query, 5);
        if (!results.length) {
          react("❌");
          return api.sendMessage(
            `❌ "${query}" — kono app pawa jayni.\n\n` +
            `🔗 Google Play e try koro:\n${playStoreSearchUrl(query)}`,
            threadID, messageID
          );
        }
        app = results[0];
        cache.set(key, { app, t: Date.now() });
        if (cache.size > 300) cache.delete(cache.keys().next().value);
      }

      /* ═══ Render card ═══ */
      const platform = app.kind === "mac-software" ? "macOS" : "iOS";
      const pngBuf = await renderCard(app, platform);

      const tmpPath = path.join(TMP_DIR, `appstore_${Date.now()}.png`);
      await fs.writeFile(tmpPath, pngBuf);

      /* ═══ Links ═══ */
      const iosLink = app.trackViewUrl || "";
      const playLink = playStoreSearchUrl(query);
      const price = app.formattedPrice && app.formattedPrice !== "Get" ? app.formattedPrice : "FREE";

      const body =
        `📱  ${app.trackName}\n` +
        `👤  ${app.artistName}\n` +
        `⭐  ${parseFloat(app.averageUserRating || 0).toFixed(1)} (${(app.userRatingCount || 0).toLocaleString()})\n` +
        `💾  ${fmtBytes(app.fileSizeBytes)}  •  v${app.version || "—"}  •  ${price}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🍎  iOS:  ${iosLink}\n` +
        `🤖  Android:  ${playLink}`;

      react("✅");

      api.sendMessage(
        { body, attachment: fs.createReadStream(tmpPath) },
        threadID,
        (err) => {
          try { fs.unlinkSync(tmpPath); } catch (_) {}
          if (err) console.error("[appstore] send err:", err.message);
        }
      );

    } catch (e) {
      console.error("[appstore] error:", e.message);
      react("❌");
      api.sendMessage(`❌ Error: ${String(e.message).slice(0, 100)}`, threadID, messageID);
    }
  }
};

// © 2026 NEXUS BOT V1