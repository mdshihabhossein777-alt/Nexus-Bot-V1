/**
 * commands/download/vd.js
 * NEXUS BOT V1 — Universal Video Downloader (URL + search by name)
 * Short cmd: /vd
 * © 2026
 */

"use strict";

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const yts = require("yt-search");

/* ═══════════════════════════════════════════════════════════════════
   SEARCH STORE (for reply selection)
   ═══════════════════════════════════════════════════════════════════ */
const vdSearches = new Map();

setInterval(() => {
  const now = Date.now();
  const FIVE_MIN = 5 * 60 * 1000;
  for (const [k, v] of vdSearches) {
    if (v && v.time && now - v.time > FIVE_MIN) vdSearches.delete(k);
  }
}, 60 * 1000);

/* ═══════════════════════════════════════════════════════════════════
   PLATFORM DETECTOR
   ═══════════════════════════════════════════════════════════════════ */
function detectPlatform(url) {
  const u = String(url).toLowerCase();
  if (/tiktok\.com|vt\.tiktok|vm\.tiktok/.test(u))      return "tiktok";
  if (/instagram\.com|instagr\.am/.test(u))              return "instagram";
  if (/facebook\.com|fb\.watch|fb\.me/.test(u))          return "facebook";
  if (/youtube\.com|youtu\.be/.test(u))                  return "youtube";
  if (/twitter\.com|x\.com/.test(u))                     return "twitter";
  if (/pinterest\.com|pin\.it/.test(u))                  return "pinterest";
  if (/reddit\.com|redd\.it/.test(u))                    return "reddit";
  if (/snapchat\.com/.test(u))                           return "snapchat";
  if (/threads\.net/.test(u))                            return "threads";
  if (/capcut\.com/.test(u))                             return "capcut";
  if (/likee\.video/.test(u))                            return "likee";
  if (/vimeo\.com/.test(u))                              return "vimeo";
  if (/dailymotion\.com|dai\.ly/.test(u))                return "dailymotion";
  if (/twitch\.tv/.test(u))                              return "twitch";
  if (/soundcloud\.com/.test(u))                         return "soundcloud";
  if (/spotify\.com/.test(u))                            return "spotify";
  return "unknown";
}

/* ═══════════════════════════════════════════════════════════════════
   FIND VIDEO URL FROM ANY RESPONSE
   ═══════════════════════════════════════════════════════════════════ */
const SKIP_KEYS = new Set([
  "thumbnail", "thumb", "cover", "poster", "image", "img",
  "avatar", "photo", "audio", "mp3", "music", "preview", "icon",
  "profile_pic", "profilePic", "avatar_url"
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

  const hdKeys = ["hd", "HD", "hdplay", "playHD", "video_hd", "hdVideo", "hdUrl", "hd_url"];
  for (const k of hdKeys) if (looksLikeVideoUrl(data[k])) return data[k];

  const vKeys = [
    "video", "videoUrl", "video_url", "videourl",
    "download_url", "downloadUrl", "download",
    "nowm", "nowmplay", "nowatermark", "no_watermark",
    "play", "playUrl", "play_url",
    "mp4", "mp4Url", "mp4_url",
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

/* ═══════════════════════════════════════════════════════════════════
   GET VIDEO URL — multi-source fallback
   ═══════════════════════════════════════════════════════════════════ */
async function getVideoUrl(url, platform) {
  const errors = [];

  /* ── SOURCE 1: btch-downloader ── */
  try {
    const btch = require("btch-downloader");
    const fnMap = {
      tiktok:    ["tiktok", "tiktokdl", "tt"],
      instagram: ["instagram", "igdl", "ig"],
      facebook:  ["facebook", "fbdl", "fb"],
      youtube:   ["youtube", "ytmp4", "yt"],
      twitter:   ["twitter", "twitterdl", "twdl"],
      pinterest: ["pinterest", "pindl"],
      reddit:    ["reddit", "redditdl"],
      snapchat:  ["snapchat", "snapdl"],
      soundcloud:["soundcloud", "scdl"],
      spotify:   ["spotify"],
      capcut:    ["capcut"],
      likee:     ["likee"],
      threads:   ["threads"],
      vimeo:     ["vimeo"],
      dailymotion:["dailymotion", "dm"]
    };

    const fns = fnMap[platform] || [];

    for (const fnName of fns) {
      if (typeof btch[fnName] !== "function") continue;
      try {
        const data = await btch[fnName](url);
        const vid = findVideoUrl(data);
        if (vid) {
          console.log(`[vd] ✅ btch.${fnName} worked`);
          return vid;
        }
      } catch (e) { errors.push(`btch.${fnName}: ${e.message}`); }
    }

    for (const fnName of Object.keys(btch)) {
      if (typeof btch[fnName] !== "function") continue;
      if (fnName.startsWith("_") || fnName.startsWith("v")) continue;
      if (fns.includes(fnName)) continue;
      try {
        const data = await btch[fnName](url);
        const vid = findVideoUrl(data);
        if (vid) {
          console.log(`[vd] ✅ btch.${fnName} (brute) worked`);
          return vid;
        }
      } catch (_) {}
    }
  } catch (e) { errors.push(`btch: ${e.message}`); }

  /* ── SOURCE 2: fdown-downloader ── */
  try {
    const fdown = require("fdown-downloader");
    for (const fnName of Object.keys(fdown)) {
      if (typeof fdown[fnName] !== "function") continue;
      try {
        const data = await fdown[fnName](url);
        const vid = findVideoUrl(data);
        if (vid) {
          console.log(`[vd] ✅ fdown.${fnName} worked`);
          return vid;
        }
      } catch (_) {}
    }
  } catch (e) { errors.push(`fdown: ${e.message}`); }

  /* ── SOURCE 3: nayan-media-downloader ── */
  try {
    const ndl = require("nayan-media-downloader");
    for (const fnName of Object.keys(ndl)) {
      if (typeof ndl[fnName] !== "function") continue;
      try {
        const data = await ndl[fnName](url);
        const vid = findVideoUrl(data);
        if (vid) {
          console.log(`[vd] ✅ nayan.${fnName} worked`);
          return vid;
        }
      } catch (_) {}
    }
  } catch (e) { errors.push(`nayan: ${e.message}`); }

  /* ── SOURCE 4: yt-dlp for YouTube ── */
  if (platform === "youtube") {
    try {
      const { YtDlp } = require("ytdlp-nodejs");
      const ytdlp = new YtDlp();
      const info = await ytdlp.getInfo(url);
      const formats = (info && info.formats) || [];
      const mp4 = formats
        .filter((f) => f.ext === "mp4" && f.vcodec !== "none" && f.url)
        .sort((a, b) => (b.height || 0) - (a.height || 0))[0];
      if (mp4) {
        console.log(`[vd] ✅ ytdlp worked`);
        return mp4.url;
      }
    } catch (e) { errors.push(`ytdlp: ${e.message}`); }
  }

  throw new Error("No source worked. " + (errors.length ? "(" + errors.slice(0, 2).join(" | ") + ")" : ""));
}

/* ═══════════════════════════════════════════════════════════════════
   DOWNLOAD FILE
   ═══════════════════════════════════════════════════════════════════ */
async function downloadFile(url, outPath) {
  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 180000,
    maxContentLength: 100 * 1024 * 1024,
    maxBodyLength: 100 * 1024 * 1024,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "*/*"
    }
  });

  return new Promise((resolve, reject) => {
    const w = fs.createWriteStream(outPath);
    res.data.pipe(w);
    res.data.on("error", reject);
    w.on("error", reject);
    w.on("finish", () => {
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

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */
function extractUrl(text) {
  const m = String(text || "").match(/https?:\/\/[^\s]+/i);
  return m ? m[0] : null;
}

function guessExt(videoUrl) {
  const m = String(videoUrl).match(/\.(mp4|mov|webm|mkv|m4v)(\?|$)/i);
  if (m) return m[1].toLowerCase();
  return "mp4";
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

/* ═══════════════════════════════════════════════════════════════════
   DOWNLOAD + SEND HELPER (shared by URL & search path)
   ═══════════════════════════════════════════════════════════════════ */
async function downloadAndSend(api, threadID, videoUrl, platform, react, messageID) {
  let tmpPath = null;
  try {
    const ext = guessExt(videoUrl);
    tmpPath = path.join(os.tmpdir(), `vd_${Date.now()}.${ext}`);

    const { size } = await downloadFile(videoUrl, tmpPath);
    const mb = size / 1024 / 1024;
    console.log(`[vd] downloaded ${mb.toFixed(2)} MB`);

    if (mb > 25) {
      react("⚠️");
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      api.sendMessage(
        `⚠️ Video too big: ${mb.toFixed(1)} MB\n📦 Messenger limit: 25 MB\n\n🔗 ${videoUrl.slice(0, 280)}`,
        threadID
      );
      return;
    }

    react("✅");
    api.sendMessage({
      body: `🎬 ${platform.toUpperCase()} • ${mb.toFixed(2)} MB`,
      attachment: fs.createReadStream(tmpPath)
    }, threadID, (err) => {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      if (err) console.error("[vd] send err:", err.message);
    });
  } catch (e) {
    if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    throw e;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════════════ */
module.exports = {
  name: "vd",
  aliases: ["vid", "vdl", "video", "dl"],
  version: "2.0.0",
  role: 0,
  description: "Download video from URL or search by name",
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

    /* Extract URL from args/body/reply */
    let url = (args || []).find((a) => /^https?:\/\//i.test(a));
    if (!url) url = extractUrl(body);
    if (!url && messageReply && messageReply.body) url = extractUrl(messageReply.body);

    /* ═══ CASE 1: URL present → download directly ═══ */
    if (url) {
      const platform = detectPlatform(url);
      console.log(`[vd] URL mode: platform=${platform} url="${url.slice(0, 80)}"`);
      react("⏳");

      try {
        const videoUrl = await getVideoUrl(url, platform);
        console.log(`[vd] video url: ${videoUrl.slice(0, 120)}`);
        await downloadAndSend(api, threadID, videoUrl, platform, react, messageID);
      } catch (e) {
        console.error("[vd] error:", e.message);
        react("❌");
        api.sendMessage(
          `❌ Download failed\n📌 Platform: ${platform}\n💬 ${e.message.slice(0, 200)}`,
          threadID
        );
      }
      return;
    }

    /* ═══ CASE 2: No URL → search by name (YouTube) ═══ */
    /* Strip command name from body */
    let query = (body || "").trim();
    const prefix = config.prefix || "/";
    if (query.startsWith(prefix)) query = query.slice(prefix.length).trim();
    query = query.replace(/^(vd|vid|vdl|video|dl)\s+/i, "").trim();

    if (!query && args.length) query = args.join(" ").trim();

    if (!query) {
      react("❓");
      return api.sendMessage(
        `🎬 VIDEO DOWNLOADER\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📌 Usage:\n` +
        `• /vd <url>           → direct download\n` +
        `• /vd <search term>   → search YouTube\n\n` +
        `✅ URL supports: TikTok, FB, IG, YT,\n` +
        `   Twitter, Pinterest, Reddit & more`,
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
        const views = v.views ? `${(v.views / 1000).toFixed(0)}K` : "?";
        lines.push(`${i + 1}. ${title}`);
        lines.push(`   👤 ${author}  ⏱️ ${dur}  👁️ ${views}`);
      });
      lines.push(``, `📩 Reply with a number (1-${results.length}) to download.`);

      api.sendMessage(lines.join("\n"), threadID, (err, info) => {
        if (err) return console.error("[vd] list err:", err.message);

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

        /* Auto-unsend list after 60s */
        if (realMID) {
          setTimeout(() => {
            try { api.unsendMessage(realMID, () => {}); } catch (_) {}
          }, 60000);
        }

        /* Cleanup after 5 min */
        setTimeout(() => {
          if (vdSearches.has(storeKey)) vdSearches.delete(storeKey);
          if (vdSearches.has(fallbackKey)) vdSearches.delete(fallbackKey);
        }, 5 * 60 * 1000);

        console.log(`[vd] stored search: ${storeKey}`);
      });

    } catch (e) {
      console.error("[vd] search error:", e.message);
      react("❌");
      api.sendMessage(`❌ Search failed: ${e.message}`, threadID);
    }
  },

  /* ═══════════════════════════════════════════════════════════════════
     REPLY HANDLER — user replies with a number
     ═══════════════════════════════════════════════════════════════════ */
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
    if (event.messageID) {
      try { api.setMessageReaction("⏳", event.messageID, threadID, () => {}); } catch (_) {}
    }

    const react = (e) => {
      if (event.messageID) {
        try { api.setMessageReaction(e, event.messageID, threadID, () => {}); } catch (_) {}
      }
    };

    try {
      console.log(`[vd] downloading: ${video.title} (${video.videoId})`);
      const url = `https://www.youtube.com/watch?v=${video.videoId}`;
      const videoUrl = await getVideoUrl(url, "youtube");

      if (!videoUrl) throw new Error("No video URL found");

      await downloadAndSend(api, threadID, videoUrl, "youtube", react, event.messageID);

      /* Cleanup */
      if (replyToID) vdSearches.delete(replyToID);
      vdSearches.delete(fallbackKey);
    } catch (e) {
      console.error("[vd] download error:", e.message);
      react("❌");
      api.sendMessage(
        `❌ Download failed\n` +
        `📌 ${video.title.slice(0, 50)}\n` +
        `💬 ${e.message.slice(0, 150)}`,
        threadID
      );
    }

    return true;
  }
};

// © 2026 NEXUS BOT V1