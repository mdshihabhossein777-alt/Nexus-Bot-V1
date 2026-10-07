/**
 * commands/download/vd.js
 * NEXUS BOT V1 — Video Downloader (25MB limit enforced)
 * © 2026
 */

"use strict";

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const yts = require("yt-search");

/* ═══ CONSTANTS ═══ */
const MAX_SIZE_MB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/* ═══ Search Store ═══ */
const vdSearches = new Map();

setInterval(() => {
  const now = Date.now();
  const FIVE_MIN = 5 * 60 * 1000;
  for (const [k, v] of vdSearches) {
    if (v && v.time && now - v.time > FIVE_MIN) vdSearches.delete(k);
  }
}, 60 * 1000);

/* ═══ Platform Detector ═══ */
function detectPlatform(url) {
  const u = String(url).toLowerCase();
  if (/tiktok\.com|vt\.tiktok|vm\.tiktok/.test(u)) return "tiktok";
  if (/instagram\.com|instagr\.am/.test(u))         return "instagram";
  if (/facebook\.com|fb\.watch|fb\.me/.test(u))     return "facebook";
  if (/youtube\.com|youtu\.be/.test(u))             return "youtube";
  if (/twitter\.com|x\.com/.test(u))                return "twitter";
  if (/pinterest\.com|pin\.it/.test(u))             return "pinterest";
  if (/reddit\.com|redd\.it/.test(u))               return "reddit";
  if (/snapchat\.com/.test(u))                      return "snapchat";
  if (/threads\.net/.test(u))                       return "threads";
  if (/capcut\.com/.test(u))                        return "capcut";
  if (/likee\.video/.test(u))                       return "likee";
  if (/vimeo\.com/.test(u))                         return "vimeo";
  if (/dailymotion\.com|dai\.ly/.test(u))           return "dailymotion";
  if (/soundcloud\.com/.test(u))                    return "soundcloud";
  if (/spotify\.com/.test(u))                       return "spotify";
  return "unknown";
}

/* ═══ Find Video URL from any response ═══ */
const SKIP_KEYS = new Set([
  "thumbnail", "thumb", "cover", "poster", "image", "img",
  "avatar", "photo", "audio", "mp3", "music", "preview", "icon"
]);

function looksLikeVideoUrl(v) {
  if (typeof v !== "string") return false;
  if (!/^https?:\/\//i.test(v)) return false;
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?|$)/i.test(v)) return false;
  return true;
}

function findVideoUrl(data, depth = 0) {
  if (!data || depth > 6) return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const r = findVideoUrl(item, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof data !== "object") return null;

  const hdKeys = ["hd", "HD", "hdplay", "playHD", "video_hd", "hdUrl"];
  for (const k of hdKeys) if (looksLikeVideoUrl(data[k])) return data[k];

  const vKeys = [
    "video", "videoUrl", "video_url",
    "download_url", "downloadUrl", "download",
    "nowm", "nowmplay", "no_watermark",
    "play", "playUrl", "mp4", "mp4Url",
    "url", "link", "src"
  ];
  for (const k of vKeys) if (looksLikeVideoUrl(data[k])) return data[k];

  for (const k of Object.keys(data)) {
    if (SKIP_KEYS.has(k)) continue;
    const r = findVideoUrl(data[k], depth + 1);
    if (r) return r;
  }
  return null;
}

/* ═══ Multi-source Video URL ═══ */
async function getVideoUrl(url, platform) {
  const errors = [];

  try {
    const btch = require("btch-downloader");
    const fnMap = {
      tiktok: ["tiktok", "tiktokdl", "tt"],
      instagram: ["instagram", "igdl", "ig"],
      facebook: ["facebook", "fbdl", "fb"],
      youtube: ["youtube", "ytmp4", "yt"],
      twitter: ["twitter", "twitterdl", "twdl"],
      pinterest: ["pinterest", "pindl"],
      reddit: ["reddit", "redditdl"],
      snapchat: ["snapchat", "snapdl"],
      soundcloud: ["soundcloud", "scdl"],
      spotify: ["spotify"],
      capcut: ["capcut"],
      likee: ["likee"],
      threads: ["threads"],
      vimeo: ["vimeo"],
      dailymotion: ["dailymotion", "dm"]
    };

    const fns = fnMap[platform] || [];
    for (const fnName of fns) {
      if (typeof btch[fnName] !== "function") continue;
      try {
        const data = await btch[fnName](url);
        const vid = findVideoUrl(data);
        if (vid) { console.log(`[vd] ✅ btch.${fnName}`); return vid; }
      } catch (e) { errors.push(`btch.${fnName}: ${e.message}`); }
    }
  } catch (e) { errors.push(`btch: ${e.message}`); }

  try {
    const fdown = require("fdown-downloader");
    for (const fnName of Object.keys(fdown)) {
      if (typeof fdown[fnName] !== "function") continue;
      try {
        const data = await fdown[fnName](url);
        const vid = findVideoUrl(data);
        if (vid) { console.log(`[vd] ✅ fdown.${fnName}`); return vid; }
      } catch (_) {}
    }
  } catch (e) { errors.push(`fdown: ${e.message}`); }

  try {
    const ndl = require("nayan-media-downloader");
    for (const fnName of Object.keys(ndl)) {
      if (typeof ndl[fnName] !== "function") continue;
      try {
        const data = await ndl[fnName](url);
        const vid = findVideoUrl(data);
        if (vid) { console.log(`[vd] ✅ nayan.${fnName}`); return vid; }
      } catch (_) {}
    }
  } catch (e) { errors.push(`nayan: ${e.message}`); }

  throw new Error("No source worked. " + errors.slice(0, 2).join(" | "));
}

/* ═══ Cookie Path Resolver ═══ */
function getCookiePath() {
  const candidates = [
    path.join(__dirname, "..", "..", "cookies.txt"),
    "/opt/render/project/src/cookies.txt",
    "/app/cookies.txt",
    path.join(process.cwd(), "cookies.txt"),
    path.join(os.tmpdir(), "yt-cookies.txt")
  ];

  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch (_) {}
  }

  if (process.env.YT_COOKIES_B64) {
    try {
      const decoded = Buffer.from(process.env.YT_COOKIES_B64, "base64").toString("utf8");
      const tmp = path.join(os.tmpdir(), "yt-cookies.txt");
      fs.writeFileSync(tmp, decoded);
      return tmp;
    } catch (_) {}
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════
   ⚡ GET CONTENT-LENGTH BEFORE DOWNLOAD
   ═══════════════════════════════════════════════════════════ */
async function getRemoteSize(url) {
  try {
    const r = await axios.head(url, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*"
      },
      maxRedirects: 5
    });
    const len = r.headers["content-length"];
    if (len) return parseInt(len);
  } catch (_) {}

  /* Fallback — Range request for first byte */
  try {
    const r = await axios.get(url, {
      headers: {
        "Range": "bytes=0-1",
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 15000
    });
    const cr = r.headers["content-range"]; /* e.g. bytes 0-1/12345678 */
    if (cr) {
      const m = cr.match(/\/(\d+)$/);
      if (m) return parseInt(m[1]);
    }
  } catch (_) {}

  return null;
}

/* ═══ Direct YouTube Download (with size guard) ═══ */
async function downloadYoutubeDirect(videoId) {
  const { YtDlp } = require("ytdlp-nodejs");
  const ytdlp = new YtDlp();

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const tmpPath = path.join(os.tmpdir(), `vd_yt_${Date.now()}.mp4`);

  /* ⚡ Try 360p first — small size */
  const opts = {
    output: tmpPath,
    videoQuality: "360",
    noWarnings: true,
    noProgress: true,
    retries: 3,
    extractorArgs: "youtube:player_client=android,ios,web_safari"
  };

  const cookiesPath = getCookiePath();
  if (cookiesPath) opts.cookies = cookiesPath;

  const result = await ytdlp.downloadVideo(url, "mp4", opts);

  let finalPath = null;
  if (result && result.filePaths && result.filePaths.length) {
    finalPath = result.filePaths[0];
  } else if (fs.existsSync(tmpPath)) {
    finalPath = tmpPath;
  }

  if (!finalPath || !fs.existsSync(finalPath)) {
    throw new Error("Download failed");
  }

  const stat = fs.statSync(finalPath);

  /* ⚡ If over 25MB — try 240p fallback */
  if (stat.size > MAX_SIZE_BYTES) {
    console.log(`[vd] 360p too big (${(stat.size / 1024 / 1024).toFixed(1)} MB) — trying 240p`);
    try { fs.unlinkSync(finalPath); } catch (_) {}

    const opts2 = {
      output: tmpPath,
      videoQuality: "240",
      noWarnings: true,
      noProgress: true,
      retries: 3,
      extractorArgs: "youtube:player_client=android,ios,web_safari"
    };
    if (cookiesPath) opts2.cookies = cookiesPath;

    const result2 = await ytdlp.downloadVideo(url, "mp4", opts2);
    let finalPath2 = null;
    if (result2 && result2.filePaths && result2.filePaths.length) {
      finalPath2 = result2.filePaths[0];
    } else if (fs.existsSync(tmpPath)) {
      finalPath2 = tmpPath;
    }

    if (!finalPath2 || !fs.existsSync(finalPath2)) {
      throw new Error("240p fallback failed");
    }

    const stat2 = fs.statSync(finalPath2);
    if (stat2.size > MAX_SIZE_BYTES) {
      try { fs.unlinkSync(finalPath2); } catch (_) {}
      throw new Error(`Video too big (${(stat2.size / 1024 / 1024).toFixed(1)} MB > ${MAX_SIZE_MB} MB)`);
    }
    return { path: finalPath2, size: stat2.size };
  }

  return { path: finalPath, size: stat.size };
}

/* ═══════════════════════════════════════════════════════════
   ⚡ STREAM DOWNLOAD — with mid-download abort
   ═══════════════════════════════════════════════════════════ */
async function downloadFile(url, outPath) {
  /* ═══ Step 1: Check size BEFORE download ═══ */
  const remoteSize = await getRemoteSize(url);
  if (remoteSize && remoteSize > MAX_SIZE_BYTES) {
    throw new Error(`Video too big (${(remoteSize / 1024 / 1024).toFixed(1)} MB > ${MAX_SIZE_MB} MB)`);
  }

  /* ═══ Step 2: Stream with mid-download abort ═══ */
  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 180000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "*/*"
    }
  });

  return new Promise((resolve, reject) => {
    const w = fs.createWriteStream(outPath);
    let downloaded = 0;
    let aborted = false;

    res.data.on("data", (chunk) => {
      downloaded += chunk.length;

      /* ⚡ Abort if over limit */
      if (downloaded > MAX_SIZE_BYTES && !aborted) {
        aborted = true;
        try { res.data.destroy(); } catch (_) {}
        try { w.destroy(); } catch (_) {}
        try { fs.unlinkSync(outPath); } catch (_) {}
        reject(new Error(`Video too big (>${MAX_SIZE_MB} MB) — aborted`));
      }
    });

    res.data.pipe(w);
    res.data.on("error", (e) => { if (!aborted) reject(e); });
    w.on("error", (e) => { if (!aborted) reject(e); });
    w.on("finish", () => {
      if (aborted) return;
      let sz = 0;
      try { sz = fs.statSync(outPath).size; } catch (_) {}
      if (sz < 10000) {
        try { fs.unlinkSync(outPath); } catch (_) {}
        return reject(new Error(`File too small (${sz} bytes)`));
      }
      resolve({ path: outPath, size: sz });
    });
  });
}

/* ═══ Helpers ═══ */
function extractUrl(text) {
  const m = String(text || "").match(/https?:\/\/[^\s]+/i);
  return m ? m[0] : null;
}

function guessExt(videoUrl) {
  const m = String(videoUrl).match(/\.(mp4|mov|webm|mkv|m4v)(\?|$)/i);
  return m ? m[1].toLowerCase() : "mp4";
}

function cleanOldTmp() {
  try {
    const now = Date.now();
    const ONE_HOUR = 3600 * 1000;
    for (const f of fs.readdirSync(os.tmpdir())) {
      if (!f.startsWith("vd_")) continue;
      const fp = path.join(os.tmpdir(), f);
      try {
        const st = fs.statSync(fp);
        if (now - st.mtimeMs > ONE_HOUR) fs.unlinkSync(fp);
      } catch (_) {}
    }
  } catch (_) {}
}

/* ═══ Download + Send (final 25MB check) ═══ */
async function downloadAndSend(api, threadID, source, platform, react) {
  let finalPath = null;

  try {
    if (platform === "youtube" && source.videoId) {
      const r = await downloadYoutubeDirect(source.videoId);
      finalPath = r.path;
      console.log(`[vd] yt-dlp downloaded ${(r.size / 1024 / 1024).toFixed(2)} MB`);
    } else {
      const ext = guessExt(source.url);
      finalPath = path.join(os.tmpdir(), `vd_${Date.now()}.${ext}`);
      const r = await downloadFile(source.url, finalPath);
      console.log(`[vd] streamed ${(r.size / 1024 / 1024).toFixed(2)} MB`);
    }

    /* ⚡ Final safety check */
    const stat = fs.statSync(finalPath);
    const mb = stat.size / 1024 / 1024;

    if (mb > MAX_SIZE_MB) {
      react("⚠️");
      try { fs.unlinkSync(finalPath); } catch (_) {}
      api.sendMessage(
        `⚠️ Video too big: ${mb.toFixed(1)} MB\n📦 Messenger limit: ${MAX_SIZE_MB} MB\n\n❌ Skip korlam.`,
        threadID
      );
      return;
    }

    react("✅");
    api.sendMessage({
      body: `🎬 ${platform.toUpperCase()} • ${mb.toFixed(2)} MB`,
      attachment: fs.createReadStream(finalPath)
    }, threadID, () => {
      try { fs.unlinkSync(finalPath); } catch (_) {}
    });

  } catch (e) {
    if (finalPath) { try { fs.unlinkSync(finalPath); } catch (_) {} }
    throw e;
  }
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════ */
module.exports = {
  name: "vd",
  aliases: ["vid", "vdl", "video"],
  version: "2.2.0",
  role: 0,
  description: "Download video (25MB limit enforced)",
  usage: "/vd <url | search term>",
  category: "download",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, body, messageReply, senderID } = event;

    const react = (e) => {
      if (messageID) {
        try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
      }
    };

    cleanOldTmp();

    /* Extract URL */
    let url = (args || []).find((a) => /^https?:\/\//i.test(a));
    if (!url) url = extractUrl(body);
    if (!url && messageReply && messageReply.body) url = extractUrl(messageReply.body);

    /* ═══ CASE 1: URL ═══ */
    if (url) {
      const platform = detectPlatform(url);
      console.log(`[vd] URL mode: platform=${platform}`);

      if (platform === "youtube") {
        const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
        if (m) {
          react("⏳");
          try {
            await downloadAndSend(api, threadID, { videoId: m[1] }, "youtube", react);
          } catch (e) {
            console.error("[vd] error:", e.message);
            react("❌");
            api.sendMessage(
              e.message.includes("too big") ? `⚠️ ${e.message}` : `❌ Download failed: ${e.message.slice(0, 150)}`,
              threadID
            );
          }
          return;
        }
      }

      react("⏳");
      try {
        const videoUrl = await getVideoUrl(url, platform);
        console.log(`[vd] video url: ${videoUrl.slice(0, 120)}`);
        await downloadAndSend(api, threadID, { url: videoUrl }, platform, react);
      } catch (e) {
        console.error("[vd] error:", e.message);
        react("❌");
        api.sendMessage(
          e.message.includes("too big")
            ? `⚠️ ${e.message}`
            : `❌ Download failed\n📌 Platform: ${platform}\n💬 ${e.message.slice(0, 200)}`,
          threadID
        );
      }
      return;
    }

    /* ═══ CASE 2: Search ═══ */
    let query = (body || "").trim();
    const prefix = config.prefix || "/";
    if (query.startsWith(prefix)) query = query.slice(prefix.length).trim();
    query = query.replace(/^(vd|vid|vdl|video)\s+/i, "").trim();

    if (!query && args.length) query = args.join(" ").trim();

    if (!query) {
      react("❓");
      return api.sendMessage(
        `🎬 VIDEO DOWNLOADER\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📌 Usage:\n` +
        `• /vd <url>           → direct download\n` +
        `• /vd <search term>   → search YouTube\n\n` +
        `📦 Max size: ${MAX_SIZE_MB} MB`,
        threadID
      );
    }

    console.log(`[vd] Search mode: "${query}"`);
    react("⏳");

    try {
      const search = await yts(query);
      const results = (search?.videos || [])
        .filter((v) => v && v.title && v.videoId)
        .slice(0, 5);

      if (!results.length) {
        react("❌");
        return api.sendMessage(`❌ "${query}" — no results found.`, threadID);
      }

      react("✅");

      const lines = [`🎬 VIDEO SEARCH`, `━━━━━━━━━━━━━━━━━━`];
      results.forEach((v, i) => {
        const title = String(v.title).slice(0, 45);
        const author = String(v.author?.name || "Unknown").slice(0, 20);
        const dur = v.timestamp || "0:00";
        lines.push(`${i + 1}. ${title}`);
        lines.push(`   👤 ${author}  ⏱️ ${dur}`);
      });
      lines.push(``, `📩 Reply with a number (1-${results.length})`);

      api.sendMessage(lines.join("\n"), threadID, (err, info) => {
        if (err) return;
        const realMID = info?.messageID ? String(info.messageID) : null;
        const fallbackKey = `vdfb_${threadID}_${senderID}`;
        const storeKey = realMID || fallbackKey;

        const data = {
          results: results.map((v) => ({
            videoId: v.videoId,
            title: v.title,
            author: v.author?.name || "Unknown",
            timestamp: v.timestamp || "0:00"
          })),
          threadID: String(threadID),
          senderID: String(senderID),
          time: Date.now()
        };

        vdSearches.set(storeKey, data);
        if (realMID) vdSearches.set(fallbackKey, data);

        if (realMID) {
          setTimeout(() => {
            try { api.unsendMessage(realMID, () => {}); } catch (_) {}
          }, 60000);
        }

        setTimeout(() => {
          if (vdSearches.has(storeKey)) vdSearches.delete(storeKey);
          if (vdSearches.has(fallbackKey)) vdSearches.delete(fallbackKey);
        }, 5 * 60 * 1000);
      });

    } catch (e) {
      console.error("[vd] search error:", e.message);
      react("❌");
      api.sendMessage(`❌ Search failed: ${e.message.slice(0, 150)}`, threadID);
    }
  },

  /* ═══ Reply Handler ═══ */
  handleReply: async function (api, event, messageID, threadID, senderID, body) {
    if (!body) return false;

    const num = parseInt(String(body).trim(), 10);
    if (isNaN(num) || num < 1 || num > 5) return false;

    const replyToID = event.messageReply?.messageID ? String(event.messageReply.messageID) : null;
    const fallbackKey = `vdfb_${threadID}_${senderID}`;

    const keys = [replyToID, fallbackKey].filter(Boolean);
    let entry = null;
    for (const k of keys) {
      if (vdSearches.has(k)) { entry = vdSearches.get(k); break; }
    }

    if (!entry || !entry.results || !entry.results[num - 1]) return false;

    const video = entry.results[num - 1];

    const react = (e) => {
      if (event.messageID) {
        try { api.setMessageReaction(e, event.messageID, threadID, () => {}); } catch (_) {}
      }
    };

    react("⏳");

    try {
      console.log(`[vd] downloading: ${video.title}`);
      await downloadAndSend(api, threadID, { videoId: video.videoId }, "youtube", react);

      if (replyToID) vdSearches.delete(replyToID);
      vdSearches.delete(fallbackKey);
    } catch (e) {
      console.error("[vd] download error:", e.message);
      react("❌");
      api.sendMessage(
        e.message.includes("too big") ? `⚠️ ${e.message}` : `❌ Download failed: ${e.message.slice(0, 150)}`,
        threadID
      );
    }

    return true;
  }
};

// © 2026 NEXUS BOT V1