// @ts-nocheck
/**
 * commands/utility/uptime.js
 * NEXUS BOT V1 — Superfast uptime video with baked-in text
 * © 2026
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const { createCanvas } = require("@napi-rs/canvas");
const assets = require("../../utils/assets");
const { getFirstStart } = require("../../utils/projectAge");

const VIDEO_NAME = "uptime.mp4";
const MAX_DURATION = 13;      // second — video length cap
const PRESET = "ultrafast";   // fastest ffmpeg preset
const CRF = 32;               // higher = faster, smaller

/* ═══ Format helpers ═══ */
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

function fmtProjectAge(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor(s / 3600) % 24;
  const m = Math.floor(s / 60) % 60;
  if (d >= 1) return `${d} day${d > 1 ? "s" : ""} ${h}h ${m}m`;
  if (h >= 1) return `${h} hour${h > 1 ? "s" : ""} ${m}m`;
  return `${m} min`;
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

/* ═══ Probe video dimensions (ffprobe) ═══ */
function probeDims(videoPath) {
  return new Promise((resolve) => {
    const ff = spawn("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=s=x:p=0",
      videoPath
    ]);
    let out = "";
    ff.stdout.on("data", (d) => { out += d.toString(); });
    ff.on("error", () => resolve({ w: 1280, h: 720 }));
    ff.on("close", () => {
      const [w, h] = out.trim().split("x").map(Number);
      resolve({ w: w || 1280, h: h || 720 });
    });
  });
}

/* ═══ Render overlay PNG (all text info) ═══ */
function renderOverlay(W, H, data) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  /* Bottom box */
  const boxH = Math.round(H * 0.36);
  const boxY = H - boxH - Math.round(H * 0.03);
  const boxX = Math.round(W * 0.06);
  const boxW = W - boxX * 2;
  const radius = Math.round(W * 0.025);

  /* Glow behind box */
  ctx.save();
  ctx.shadowColor = "rgba(255, 215, 0, 0.55)";
  ctx.shadowBlur = 40;
  ctx.fillStyle = "rgba(10, 6, 32, 0.82)";
  roundRect(ctx, boxX, boxY, boxW, boxH, radius);
  ctx.fill();
  ctx.restore();

  /* Gold border */
  ctx.save();
  const borderGrad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
  borderGrad.addColorStop(0,    "#FFD700");
  borderGrad.addColorStop(0.5,  "#ff69b4");
  borderGrad.addColorStop(1,    "#00ffff");
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = Math.max(2, W / 640);
  roundRect(ctx, boxX, boxY, boxW, boxH, radius);
  ctx.stroke();
  ctx.restore();

  /* Center-aligned layout */
  const cx = W / 2;
  const baseY = boxY + boxH * 0.22;

  const setFont = (size, weight = "bold") => {
    ctx.font = `${weight} ${size}px Arial, 'DejaVu Sans', sans-serif`;
  };

  /* ── SESSION ── */
  setFont(Math.round(boxH * 0.11), "normal");
  ctx.fillStyle = "rgba(255, 215, 0, 0.75)";
  ctx.textAlign = "center";
  ctx.fillText("S E S S I O N", cx, baseY - boxH * 0.02);

  setFont(Math.round(boxH * 0.28), "bold");
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 22;
  ctx.fillText(data.session, cx, baseY + boxH * 0.26);
  ctx.shadowBlur = 0;

  /* ── Divider ── */
  const divY = baseY + boxH * 0.36;
  ctx.fillStyle = "rgba(255, 215, 0, 0.35)";
  ctx.fillRect(boxX + boxW * 0.15, divY, boxW * 0.7, Math.max(1, H / 720));

  /* ── PROJECT ── */
  setFont(Math.round(boxH * 0.11), "normal");
  ctx.fillStyle = "rgba(0, 255, 255, 0.75)";
  ctx.fillText("P R O J E C T", cx, divY + boxH * 0.16);

  setFont(Math.round(boxH * 0.22), "bold");
  ctx.fillStyle = "#FFD700";
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 18;
  ctx.fillText(data.project, cx, divY + boxH * 0.42);
  ctx.shadowBlur = 0;

  /* ── Bot name (bottom right) ── */
  setFont(Math.round(boxH * 0.10), "normal");
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.textAlign = "right";
  ctx.fillText(data.botName, boxX + boxW - boxW * 0.04, boxY + boxH - boxH * 0.06);

  return canvas.toBuffer("image/png");
}

/* ═══ ffmpeg overlay (single filter — fast) ═══ */
function runFFmpeg(videoPath, overlayPath, outPath) {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i", videoPath,
      "-i", overlayPath,
      "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto",
      "-t", String(MAX_DURATION),
      "-c:v", "libx264",
      "-preset", PRESET,
      "-crf", String(CRF),
      "-pix_fmt", "yuv420p",
      "-an",
      "-threads", "0",
      "-movflags", "+faststart",
      outPath
    ];
    const ff = spawn("ffmpeg", args);
    let err = "";
    ff.stderr.on("data", (d) => { err += d.toString(); });
    ff.on("error", (e) => reject(e));
    ff.on("close", (code) => {
      if (code === 0 && fs.existsSync(outPath)) resolve(outPath);
      else reject(new Error(`ffmpeg exit ${code}: ${err.slice(-200)}`));
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════ */
module.exports = {
  name: "uptime",
  aliases: ["up", "runtime", "botup", "age"],
  version: "3.0.0",
  role: 0,
  description: "Superfast uptime video with baked text",
  usage: "/uptime",
  category: "utility",

  checkTrigger: function (body) {
    if (!body) return false;
    const t = body.trim().toLowerCase();
    return (
      t === "uptime" || t === "up" || t === "runtime" ||
      t === "botup" || t === "age" || t.startsWith("uptime ")
    );
  },

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    react("⏳");

    let srcPath = null;
    let ovPath = null;
    let outPath = null;

    try {
      /* ═══ Times ═══ */
      const now = Date.now();
      const sessionStart = (global.NEXUS && global.NEXUS.START_TIME) || now;
      const sessionMs = now - sessionStart;

      let firstStart = (global.NEXUS && global.NEXUS.FIRST_START) || null;
      if (!firstStart) {
        try { firstStart = await getFirstStart(); } catch (_) { firstStart = sessionStart; }
      }
      const projectMs = now - firstStart;

      const data = {
        session: fmtUptime(sessionMs),
        project: fmtProjectAge(projectMs),
        botName: config.brandName || "NEXUS BOT V1"
      };

      /* ═══ Load video ═══ */
      const videoBuf = await assets.loadAsset(VIDEO_NAME);
      if (!videoBuf) {
        react("❌");
        return api.sendMessage(`❌ assets/${VIDEO_NAME} pawa jayni`, threadID);
      }

      srcPath = path.join(os.tmpdir(), `upt_src_${Date.now()}.mp4`);
      await fs.writeFile(srcPath, videoBuf);

      /* ═══ Probe dims + render overlay (parallel) ═══ */
      const dims = await probeDims(srcPath).catch(() => ({ w: 1280, h: 720 }));
      const overlayBuf = renderOverlay(dims.w, dims.h, data);

      ovPath = path.join(os.tmpdir(), `upt_ov_${Date.now()}.png`);
      await fs.writeFile(ovPath, overlayBuf);

      /* ═══ FFmpeg overlay ═══ */
      outPath = path.join(os.tmpdir(), `upt_out_${Date.now()}.mp4`);
      await runFFmpeg(srcPath, ovPath, outPath);

      console.log("[uptime] overlay done");

      react("⏱️");

      /* ═══ Send (minimal caption) ═══ */
      api.sendMessage({
        body: "⏱️",
        attachment: fs.createReadStream(outPath)
      }, threadID, () => {
        try { if (srcPath) fs.unlinkSync(srcPath); } catch (_) {}
        try { if (ovPath)  fs.unlinkSync(ovPath);  } catch (_) {}
        try { if (outPath) fs.unlinkSync(outPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[uptime] error:", e.message);
      try { if (srcPath) fs.unlinkSync(srcPath); } catch (_) {}
      try { if (ovPath)  fs.unlinkSync(ovPath);  } catch (_) {}
      try { if (outPath) fs.unlinkSync(outPath); } catch (_) {}
      react("❌");
      api.sendMessage(`❌ ${String(e.message).slice(0, 100)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1