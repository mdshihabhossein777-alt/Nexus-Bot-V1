/**
 * commands/utility/uptime.js
 * NEXUS BOT V1 — Animated uptime card with video
 * © 2026
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const assets = require("../../utils/assets");

const VIDEO_NAME = "uptime.mp4";
const OVERLAY = true; // false dile raw video jabe (ffmpeg nai hole auto-off)
const LOOP_TO = 20;   // video loop kore 20s banabe (13s → 20s)

/* ═══ Uptime formatter ═══ */
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

/* ═══ Find TTF font for ffmpeg ═══ */
function findFont() {
  const candidates = [
    path.join(__dirname, "..", "..", "assets", "font.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "C:/Windows/Fonts/arial.ttf"
  ];
  for (const f of candidates) {
    try { if (fs.existsSync(f)) return f; } catch (_) {}
  }
  return null;
}

/* ═══ ffmpeg: loop + burn text ═══ */
function ffmpegProcess(inputPath, outputPath, uptimeText, botName) {
  return new Promise((resolve, reject) => {
    const font = findFont();

    /* Escape special chars */
    const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");

    const line1 = esc(`UPTIME  ·  ${uptimeText}`);
    const line2 = esc(botName);

    /* Two drawtext filters — title + bot name */
    const draw1 =
      `drawtext=text='${line1}':` +
      `fontcolor=white:fontsize=56:` +
      `x=(w-text_w)/2:y=h-200:` +
      `box=1:boxcolor=black@0.60:boxborderw=22:` +
      `shadowcolor=black@0.85:shadowx=3:shadowy=3`;

    const draw2 =
      `drawtext=text='${line2}':` +
      `fontcolor=#FFD700:fontsize=30:` +
      `x=(w-text_w)/2:y=h-110:` +
      `box=1:boxcolor=black@0.45:boxborderw=14`;

    const draw1F = font ? `drawtext=fontfile='${font}':` + draw1.slice("drawtext=".length) : draw1;
    const draw2F = font ? `drawtext=fontfile='${font}':` + draw2.slice("drawtext=".length) : draw2;

    const vf = `${draw1F},${draw2F}`;

    const args = [
      "-y",
      "-stream_loop", "-1",           // infinite loop input
      "-i", inputPath,
      "-t", String(LOOP_TO),          // cut at LOOP_TO seconds
      "-vf", vf,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "28",
      "-pix_fmt", "yuv420p",
      "-an",                          // strip audio (silent)
      "-movflags", "+faststart",
      outputPath
    ];

    const ff = spawn("ffmpeg", args);
    let err = "";
    ff.stderr.on("data", (d) => { err += d.toString(); });
    ff.on("error", (e) => reject(e));
    ff.on("close", (code) => {
      if (code === 0 && fs.existsSync(outputPath)) resolve(outputPath);
      else reject(new Error(`ffmpeg exit ${code}: ${err.slice(-200)}`));
    });
  });
}

/* ═══ Check ffmpeg available ═══ */
function hasFfmpeg() {
  return new Promise((resolve) => {
    const ff = spawn("ffmpeg", ["-version"]);
    ff.on("error", () => resolve(false));
    ff.on("close", (code) => resolve(code === 0));
  });
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════ */
module.exports = {
  name: "uptime",
  aliases: ["up", "runtime", "botup"],
  version: "1.0.0",
  role: 0,
  description: "Animated uptime card with video",
  usage: "/uptime",
  category: "utility",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    react("⏳");

    let srcPath = null;
    let outPath = null;

    try {
      const START = (global.NEXUS && global.NEXUS.START_TIME) || Date.now();
      const up = Date.now() - START;
      const text = fmtUptime(up);
      const botName = config.brandName || "NEXUS BOT V1";

      /* ═══ Load video ═══ */
      const videoBuf = await assets.loadAsset(VIDEO_NAME);

      if (!videoBuf) {
        react("❌");
        return api.sendMessage(
          `❌ Video pawa jayni: assets/${VIDEO_NAME}\n\n` +
          `⏱️ Uptime: **${text}**\n` +
          `📝 Video ta ekhane rakho: assets/${VIDEO_NAME}`,
          threadID
        );
      }

      srcPath = path.join(os.tmpdir(), `uptime_src_${Date.now()}.mp4`);
      await fs.writeFile(srcPath, videoBuf);

      let finalPath = srcPath;

      /* ═══ Try ffmpeg overlay (with loop) ═══ */
      if (OVERLAY) {
        const ffOk = await hasFfmpeg();
        if (!ffOk) {
          console.log("[uptime] ffmpeg nai — raw video pathabo");
        } else {
          try {
            outPath = path.join(os.tmpdir(), `uptime_out_${Date.now()}.mp4`);
            await ffmpegProcess(srcPath, outPath, text, botName);
            try { fs.unlinkSync(srcPath); } catch (_) {}
            srcPath = null;
            finalPath = outPath;
            console.log("[uptime] ffmpeg overlay ✅");
          } catch (e) {
            console.log("[uptime] ffmpeg fail:", e.message.slice(0, 100));
            outPath = null;
          }
        }
      }

      react("⏱️");

      const body =
        `⏱️  **UPTIME**\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🤖  ${botName}\n` +
        `🕐  **${text}**\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `✅  Running smoothly`;

      api.sendMessage({
        body,
        attachment: fs.createReadStream(finalPath)
      }, threadID, (err) => {
        try { if (srcPath) fs.unlinkSync(srcPath); } catch (_) {}
        try { if (outPath) fs.unlinkSync(outPath); } catch (_) {}
        if (err) console.error("[uptime] send err:", err.message);
      });

    } catch (e) {
      console.error("[uptime] error:", e.message);
      try { if (srcPath) fs.unlinkSync(srcPath); } catch (_) {}
      try { if (outPath) fs.unlinkSync(outPath); } catch (_) {}
      react("❌");
      api.sendMessage(`❌ ${String(e.message).slice(0, 100)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1