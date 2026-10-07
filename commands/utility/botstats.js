/**
 * commands/utility/botstats.js
 * NEXUS BOT V1 — Bot stats card with live fake graph
 * © 2026
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const TMP_DIR = os.tmpdir();

/* ═══ Fit text ═══ */
function fitText(ctx, text, maxW, base, min, weight = "bold", family = "Arial, sans-serif") {
  let s = base;
  while (s > min) {
    ctx.font = `${weight} ${s}px ${family}`;
    if (ctx.measureText(text).width <= maxW) break;
    s -= 2;
  }
  return s;
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

/* ═══ Uptime ═══ */
function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor(s / 3600) % 24;
  const m = Math.floor(s / 60) % 60;
  const ss = s % 60;
  const p = [];
  if (d) p.push(`${d}d`);
  if (h || d) p.push(`${h}h`);
  if (m || h || d) p.push(`${m}m`);
  p.push(`${ss}s`);
  return p.join(" ");
}

/* ═══ Fake series generator — random walk with drift ═══ */
function genSeries(len, base, variance, min = 5, max = 95) {
  const out = [];
  let v = base;
  for (let i = 0; i < len; i++) {
    v += (Math.random() - 0.5) * variance;
    /* occasional spike */
    if (Math.random() < 0.08) v += (Math.random() - 0.5) * variance * 2;
    /* clamp */
    if (v < min) v = min + Math.random() * 3;
    if (v > max) v = max - Math.random() * 3;
    out.push(v);
  }
  return out;
}

/* ═══ Draw smooth line chart with gradient fill ═══ */
function drawChart(ctx, x, y, w, h, series, color, label, valueText) {
  const n = series.length;
  const pad = 4;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  /* Background card */
  ctx.save();
  roundRect(ctx, x, y, w, h, 14);
  const bg = ctx.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, "rgba(255,255,255,0.05)");
  bg.addColorStop(1, "rgba(255,255,255,0.02)");
  ctx.fillStyle = bg;
  ctx.fill();

  roundRect(ctx, x, y, w, h, 14);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  /* Grid lines */
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const gy = y + pad + (innerH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(x + pad, gy);
    ctx.lineTo(x + w - pad, gy);
    ctx.stroke();
  }
  ctx.restore();

  /* Build points */
  const points = series.map((v, i) => ({
    x: x + pad + (innerW / (n - 1)) * i,
    y: y + pad + innerH - (innerH * (v / 100))
  }));

  /* Fill area under line */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, y + h - pad);
  for (const p of points) ctx.lineTo(p.x, p.y);
  ctx.lineTo(points[n - 1].x, y + h - pad);
  ctx.closePath();
  const fillGrad = ctx.createLinearGradient(0, y, 0, y + h);
  fillGrad.addColorStop(0, color + "55");
  fillGrad.addColorStop(1, color + "00");
  ctx.fillStyle = fillGrad;
  ctx.fill();
  ctx.restore();

  /* Line */
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < n; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();

  /* Glowing dot on last point */
  const last = points[n - 1];
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(last.x, last.y, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(last.x, last.y, 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  /* Label */
  ctx.save();
  ctx.textAlign = "left";
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(label, x + 14, y + 20);
  ctx.restore();

  /* Value */
  ctx.save();
  ctx.textAlign = "right";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillText(valueText, x + w - 14, y + 22);
  ctx.restore();
}

/* ═══ Draw circular stat pill ═══ */
function drawPill(ctx, x, y, w, h, icon, label, value, color) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 12);
  const bg = ctx.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, "rgba(255,255,255,0.06)");
  bg.addColorStop(1, "rgba(255,255,255,0.02)");
  ctx.fillStyle = bg;
  ctx.fill();
  roundRect(ctx, x, y, w, h, 12);
  ctx.strokeStyle = color + "66";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";

  ctx.font = "20px Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(icon, x + w / 2, y + 30);

  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillText(value, x + w / 2, y + 60);
  ctx.shadowBlur = 0;

  ctx.font = "10px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText(label, x + w / 2, y + 78);
  ctx.restore();
}

/* ═══ Draw avatar ═══ */
async function drawBotIcon(ctx, cx, cy, r) {
  /* Glow */
  const g = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.8);
  g.addColorStop(0, "rgba(0, 200, 255, 0.4)");
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
  ctx.fill();

  /* Ring */
  const ringGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ringGrad.addColorStop(0, "#FFD700");
  ringGrad.addColorStop(0.5, "#00ffff");
  ringGrad.addColorStop(1, "#ff69b4");
  ctx.save();
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 22;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();

  /* Inner circle */
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const inner = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  inner.addColorStop(0, "#1a0b3a");
  inner.addColorStop(1, "#0a0620");
  ctx.fillStyle = inner;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.floor(r * 1.1)}px Arial, sans-serif`;
  ctx.fillStyle = "#FFD700";
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 15;
  ctx.fillText("⚡", cx, cy + 4);
  ctx.restore();
}

/* ═══ Render card ═══ */
async function renderCard(data) {
  const W = 1000, H = 720;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  /* ─ Background ─ */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0a0620");
  bg.addColorStop(0.5, "#150a35");
  bg.addColorStop(1, "#0a0620");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* Ambient glows */
  const g1 = ctx.createRadialGradient(150, 100, 0, 150, 100, 500);
  g1.addColorStop(0, "rgba(138, 43, 226, 0.35)");
  g1.addColorStop(1, "transparent");
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W - 100, H - 100, 0, W - 100, H - 100, 500);
  g2.addColorStop(0, "rgba(0, 200, 255, 0.28)");
  g2.addColorStop(1, "transparent");
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

  const g3 = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 500);
  g3.addColorStop(0, "rgba(255, 215, 0, 0.10)");
  g3.addColorStop(1, "transparent");
  ctx.fillStyle = g3; ctx.fillRect(0, 0, W, H);

  /* Particles */
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * W, y = Math.random() * H;
    ctx.beginPath();
    ctx.arc(x, y, 0.4 + Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.10 + Math.random() * 0.30})`;
    ctx.fill();
  }

  /* Border */
  ctx.save();
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 20;
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

  /* ═══════ HEADER ═══════ */
  /* Bot icon */
  await drawBotIcon(ctx, 90, 90, 42);

  /* Bot name */
  const name = data.botName || "NEXUS BOT V1";
  const nameSize = fitText(ctx, name, 500, 32, 18);
  ctx.save();
  ctx.textAlign = "left";
  ctx.font = `bold ${nameSize}px Arial, sans-serif`;
  const nameGrad = ctx.createLinearGradient(160, 60, 160, 100);
  nameGrad.addColorStop(0, "#ffffff");
  nameGrad.addColorStop(1, "#00ffff");
  ctx.fillStyle = nameGrad;
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 15;
  ctx.fillText(name, 160, 82);
  ctx.restore();

  /* Status */
  ctx.save();
  ctx.textAlign = "left";
  ctx.font = "13px Arial, sans-serif";
  ctx.fillStyle = "rgba(0, 255, 136, 0.9)";
  ctx.fillText("● ONLINE", 162, 104);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText(`• Uptime ${data.uptime}`, 235, 104);
  ctx.restore();

  /* Live badge (top right) */
  const badgeW = 100, badgeH = 30;
  const badgeX = W - badgeW - 40;
  const badgeY = 55;
  ctx.save();
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 15);
  ctx.fillStyle = "rgba(255, 0, 80, 0.15)";
  ctx.fill();
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 15);
  ctx.strokeStyle = "rgba(255, 0, 80, 0.6)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  /* Pulsing red dot */
  ctx.beginPath();
  ctx.arc(badgeX + 16, badgeY + badgeH / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#ff0050";
  ctx.shadowColor = "#ff0050";
  ctx.shadowBlur = 12;
  ctx.fill();

  ctx.font = "bold 11px Arial, sans-serif";
  ctx.fillStyle = "#ff6688";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("LIVE", badgeX + 30, badgeY + badgeH / 2 + 1);
  ctx.restore();

  /* Divider */
  ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
  ctx.fillRect(60, 135, W - 120, 1);

  /* ═══════ CHARTS ═══════ */
  const chartW = (W - 120) / 2;
  const chartH = 180;
  const chartY = 165;

  drawChart(
    ctx,
    60, chartY, chartW, chartH,
    data.cpuSeries,
    "#00ffff",
    "CPU USAGE",
    `${Math.round(data.cpuSeries[data.cpuSeries.length - 1])}%`
  );

  drawChart(
    ctx,
    60 + chartW + 20, chartY, chartW, chartH,
    data.ramSeries,
    "#ff69b4",
    "RAM USAGE",
    `${Math.round(data.ramSeries[data.ramSeries.length - 1])}%`
  );

  /* ═══════ STAT PILLS ═══════ */
  const pillY = 380;
  const pillH = 95;
  const pillW = (W - 120 - 3 * 15) / 4;

  drawPill(ctx, 60,                          pillY, pillW, pillH, "📦", "COMMANDS", String(data.commands),  "#FFD700");
  drawPill(ctx, 60 + (pillW + 15),           pillY, pillW, pillH, "👥", "GROUPS",   String(data.groups),    "#ff69b4");
  drawPill(ctx, 60 + (pillW + 15) * 2,       pillY, pillW, pillH, "👤", "USERS",    String(data.users),     "#00ffff");
  drawPill(ctx, 60 + (pillW + 15) * 3,       pillY, pillW, pillH, "⚡", "PING",     `${data.ping}ms`,       "#7CFC00");

  /* ═══════ SYSTEM INFO PANEL ═══════ */
  const infoY = 505;
  const infoH = 130;

  ctx.save();
  roundRect(ctx, 60, infoY, W - 120, infoH, 14);
  const infoBg = ctx.createLinearGradient(60, infoY, W - 60, infoY + infoH);
  infoBg.addColorStop(0, "rgba(138, 43, 226, 0.10)");
  infoBg.addColorStop(1, "rgba(0, 200, 255, 0.06)");
  ctx.fillStyle = infoBg;
  ctx.fill();
  roundRect(ctx, 60, infoY, W - 120, infoH, 14);
  ctx.strokeStyle = "rgba(255, 215, 0, 0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  /* Info label */
  ctx.save();
  ctx.textAlign = "left";
  ctx.font = "bold 11px Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 215, 0, 0.7)";
  ctx.fillText("S Y S T E M   I N F O", 78, infoY + 22);
  ctx.restore();

  /* Info rows (2 columns) */
  const col1X = 78;
  const col2X = W / 2 + 10;
  const rowY1 = infoY + 50;
  const rowY2 = infoY + 78;
  const rowY3 = infoY + 106;

  const rows = [
    { x: col1X, y: rowY1, icon: "🖥️", k: "Platform", v: data.platform },
    { x: col1X, y: rowY2, icon: "🧠", k: "CPU",      v: `${data.cpuCores} cores` },
    { x: col1X, y: rowY3, icon: "🟢", k: "Node.js",  v: `v${data.nodeVersion}` },
    { x: col2X, y: rowY1, icon: "💾", k: "RAM",      v: `${data.ramMB} MB` },
    { x: col2X, y: rowY2, icon: "📦", k: "Heap",     v: `${data.heapMB} MB` },
    { x: col2X, y: rowY3, icon: "👑", k: "Owner",    v: data.botOwner }
  ];

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  for (const r of rows) {
    ctx.font = "12px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(`${r.icon}`, r.x, r.y);

    ctx.font = "11px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(r.k, r.x + 24, r.y);

    ctx.font = "bold 12px Arial, sans-serif";
    ctx.fillStyle = "#ffffff";
    const vTxt = String(r.v);
    ctx.fillText(vTxt.length > 30 ? vTxt.slice(0, 30) + "…" : vTxt, r.x + 92, r.y);
  }
  ctx.restore();

  /* ═══════ FOOTER ═══════ */
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "11px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText(`NEXUS BOT V1  ·  Generated ${new Date().toLocaleString()}`, W / 2, H - 30);
  ctx.restore();

  return canvas.toBuffer("image/png");
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════ */
module.exports = {
  name: "botstats",
  aliases: ["bstats", "botinfo", "stats", "system"],
  version: "5.0.0",
  role: 0,
  description: "Premium bot stats card with live graph",
  usage: "/botstats",
  category: "utility",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    react("⏳");

    let tmpPath = null;

    try {
      /* ═══ Gather data ═══ */
      const START = (global.NEXUS && global.NEXUS.START_TIME) || Date.now();
      const up = Date.now() - START;
      const mem = process.memoryUsage();
      const rssMB = (mem.rss / 1048576).toFixed(1);
      const heapMB = (mem.heapUsed / 1048576).toFixed(1);

      const cmdCount = (global.NEXUS && global.NEXUS.commands)
        ? (global.NEXUS.commands.size || Object.keys(global.NEXUS.commands).length || 0)
        : 0;
      const groupCount = (global.NEXUS && global.NEXUS.groupsDB)
        ? Object.keys(global.NEXUS.groupsDB).length : 0;
      const userCount = (global.NEXUS && global.NEXUS.usersDB)
        ? Object.keys(global.NEXUS.usersDB).length : 0;

      /* ═══ Fake series (30 points each) ═══ */
      const cpuBase = 30 + Math.random() * 20;
      const ramBase = 45 + Math.random() * 15;
      const cpuSeries = genSeries(30, cpuBase, 8, 8, 95);
      const ramSeries = genSeries(30, ramBase, 6, 20, 90);

      const data = {
        botName: config.brandName || "NEXUS BOT V1",
        botOwner: config.brandOwner || "Ariyán Shihab",
        uptime: fmtUptime(up),
        platform: `${os.platform()} ${os.arch()}`,
        cpuCores: os.cpus().length,
        nodeVersion: process.version.replace(/^v/, ""),
        ramMB: rssMB,
        heapMB: heapMB,
        commands: cmdCount,
        groups: groupCount,
        users: userCount,
        ping: Math.floor(Math.random() * 40) + 20,
        cpuSeries,
        ramSeries
      };

      /* ═══ Render ═══ */
      const pngBuf = await renderCard(data);
      tmpPath = path.join(TMP_DIR, `botstats_${Date.now()}.png`);
      await fs.writeFile(tmpPath, pngBuf);

      react("📊");

      /* ═══ Send ═══ */
      api.sendMessage({
        body: `📊 **${data.botName}** — Live Stats\n⏱️ Uptime: ${data.uptime}\n⚡ Ping: ${data.ping}ms`,
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[botstats] error:", e.message);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${String(e.message).slice(0, 100)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1