// commands/download/autodl.js - NEXUS V1 - 2026 Multi-Link Edition
"use strict";

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ⚡ LOG */
const log  = (...a) => console.log("[NEXUS/autodl]", ...a);
const warn = (...a) => console.warn("[NEXUS/autodl]", ...a);
const errl = (...a) => console.error("[NEXUS/autodl]", ...a);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ⚡ MAX LINKS PER MESSAGE */
const MAX_LINKS = 5;

/* ---------- Libraries (2026) ---------- */
let btch, nayan, vidly;
try { btch = require("btch-downloader"); } catch (_) {}
try { nayan = require("nayan-media-downloader"); } catch (_) {
  try { nayan = require("nayan-media-downloaders"); } catch (_) {}
}
try { vidly = require("@raihan07/vidly"); } catch (_) {}

/* ---------- Universal URL extractor from ANY response shape ---------- */
function pickUrl(res) {
  if (!res) return null;
  if (typeof res === "string") return res.startsWith("http") ? res : null;
  if (typeof res !== "object") return null;

  /* Direct keys — HD first */
  const directKeys = [
    "hd", "HD", "hdplay", "video_hd", "hdUrl",
    "sd", "SD", "play", "playUrl", "nowm", "nowmplay",
    "no_watermark", "video", "videoUrl", "video_url",
    "url", "link", "src", "download",
    "download_url", "downloadUrl", "downloadURL", "mp4"
  ];
  for (const k of directKeys) {
    const v = res[k];
    if (typeof v === "string" && v.startsWith("http")) return v;
  }

  /* Recurse into common container keys */
  const containers = ["result", "results", "data", "medias", "links", "response", "medias"];
  for (const k of containers) {
    if (res[k]) {
      const r = pickUrl(res[k]);
      if (r) return r;
    }
  }

  /* Array */
  if (Array.isArray(res)) {
    for (const item of res) {
      const r = pickUrl(item);
      if (r) return r;
    }
  }

  return null;
}

/* ---------- Format helpers ---------- */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}
function formatSize(bytes) {
  if (!bytes) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
function formatTitle(title) {
  if (!title) return "Untitled";
  let t = String(title).replace(/[#@]/g, "").trim();
  if (t.length > 90) t = t.slice(0, 87) + "...";
  return t;
}
function detectExt(contentType, url) {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("video/mp4")) return ".mp4";
  if (ct.includes("video/webm")) return ".webm";
  if (ct.includes("video/quicktime")) return ".mov";
  if (ct.includes("video/")) return ".mp4";
  if (ct.includes("image/jpeg")) return ".jpg";
  if (ct.includes("image/png")) return ".png";
  if (ct.includes("image/gif")) return ".gif";
  if (ct.includes("image/webp")) return ".webp";
  if (ct.includes("image/")) return ".jpg";
  if (ct.includes("audio/mpeg")) return ".mp3";
  if (ct.includes("audio/mp4")) return ".m4a";
  if (ct.includes("audio/")) return ".mp3";

  const u = String(url).toLowerCase().split("?")[0];
  if (u.endsWith(".mp4")) return ".mp4";
  if (u.endsWith(".webm")) return ".webm";
  if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return ".jpg";
  if (u.endsWith(".png")) return ".png";
  if (u.endsWith(".gif")) return ".gif";
  if (u.endsWith(".mp3")) return ".mp3";
  return ".mp4";
}

async function fetchBuffer(url, timeout = 90000, maxMB = 50, forcedExt = null) {
  const r = await axios.get(url, {
    responseType: "arraybuffer",
    timeout,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    maxContentLength: maxMB * 1024 * 1024,
    maxBodyLength: maxMB * 1024 * 1024
  });
  const buffer = Buffer.from(r.data);
  const contentType = String(r.headers["content-type"] || "").toLowerCase();
  const ext = forcedExt || detectExt(contentType, url);
  return { buffer, ext, contentType };
}

/* ---------- btch multi-function caller ---------- */
async function tryBtch(names, url) {
  if (!btch) return null;
  for (const name of names) {
    const fn = btch[name];
    if (typeof fn !== "function") continue;
    try {
      const res = await fn(url);
      const u = pickUrl(res);
      if (u) { log(`[btch.${name}] ✓`); return u; }
    } catch (e) {
      warn(`[btch.${name}] ${e.message}`);
    }
  }
  return null;
}

/* ---------- nayan multi-function caller ---------- */
async function tryNayan(names, url) {
  if (!nayan) return null;
  for (const name of names) {
    const fn = nayan[name];
    if (typeof fn !== "function") continue;
    try {
      const res = await fn(url);
      const u = pickUrl(res);
      if (u) { log(`[nayan.${name}] ✓`); return u; }
    } catch (e) {
      warn(`[nayan.${name}] ${e.message}`);
    }
  }
  return null;
}

/* ---------- vidly buffer caller ---------- */
async function tryVidly(url, extHint = ".mp4") {
  if (!vidly) return null;
  const tmpOut = path.join(os.tmpdir(), `vidly_${Date.now()}${extHint}`);
  try {
    const fn = vidly.downloadVideo || vidly.download || vidly.default;
    if (typeof fn !== "function") return null;
    const res = await fn(url, tmpOut);
    const candidate = res?.filePath || res?.path || tmpOut;
    if (fs.existsSync(candidate)) {
      const buf = await fs.readFile(candidate);
      try { fs.unlinkSync(candidate); } catch (_) {}
      log(`[vidly] ✓ buffer ${(buf.length / 1024).toFixed(0)} KB`);
      return buf;
    }
  } catch (e) {
    warn(`[vidly] ${e.message}`);
  }
  try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (_) {}
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   TIKTOK
   ═══════════════════════════════════════════════════════════════════ */
async function downloadTikTok(url) {
  /* 1) tikwm */
  try {
    const r = await axios.get("https://www.tikwm.com/api/", {
      params: { url, hd: 1 },
      timeout: 25000
    });
    const d = r.data?.data;
    if (d && d.play) {
      const videoUrl = d.play.startsWith("http") ? d.play : "https://www.tikwm.com" + d.play;
      const { buffer, ext } = await fetchBuffer(videoUrl, 90000, 50, ".mp4");
      return {
        buffer, ext,
        meta: {
          site: "TikTok",
          icon: "🎵",
          title: formatTitle(d.title),
          author: d.author?.unique_id ? `@${d.author.unique_id}` : null,
          quality: d.hd ? "HD 720p" : "SD 480p",
          stats: `❤️ ${d.digg_count || 0}  💬 ${d.comment_count || 0}  ↪️ ${d.share_count || 0}`
        }
      };
    }
  } catch (e) { warn(`[tiktok/tikwm] ${e.message}`); }

  /* 2) btch fallback */
  const u = await tryBtch(["tiktok", "tt", "tiktokdl", "tikdown"], url);
  if (u) {
    const { buffer, ext } = await fetchBuffer(u, 90000, 50, ".mp4");
    return { buffer, ext, meta: { site: "TikTok", icon: "🎵", title: "TikTok Video", quality: "HD" } };
  }

  throw new Error("TikTok download failed");
}

/* ═══════════════════════════════════════════════════════════════════
   FACEBOOK
   ═══════════════════════════════════════════════════════════════════ */
async function downloadFacebook(url) {
  /* 1) vidly (direct buffer) */
  const buf = await tryVidly(url);
  if (buf && buf.length > 10000) {
    return {
      buffer: buf, ext: ".mp4",
      meta: { site: "Facebook", icon: "📘", title: "Facebook Video", quality: "HD", stats: "🔗 via vidly" }
    };
  }

  /* 2) btch */
  const btchUrl = await tryBtch(["facebook", "fbdown", "fbdl", "fb", "facebookdl"], url);
  if (btchUrl) {
    const { buffer, ext } = await fetchBuffer(btchUrl, 120000, 50, ".mp4");
    return {
      buffer, ext,
      meta: { site: "Facebook", icon: "📘", title: "Facebook Video", quality: "HD", stats: "🔗 via btch" }
    };
  }

  /* 3) nayan */
  const nayanUrl = await tryNayan(["ndown", "facebook", "fb"], url);
  if (nayanUrl) {
    const { buffer, ext } = await fetchBuffer(nayanUrl, 120000, 50, ".mp4");
    return {
      buffer, ext,
      meta: { site: "Facebook", icon: "📘", title: "Facebook Video", quality: "HD", stats: "🔗 via nayan" }
    };
  }

  /* 4) vkr */
  try {
    const r = await axios.get(
      `https://vkrdownloader.org/server/?api_key=vkrdownloader&vkr=${encodeURIComponent(url)}`,
      { timeout: 30000, headers: { "Accept": "application/json" } }
    );
    const u = pickUrl(r.data);
    if (u) {
      const { buffer, ext } = await fetchBuffer(u, 120000, 50, ".mp4");
      return {
        buffer, ext,
        meta: { site: "Facebook", icon: "📘", title: "Facebook Video", quality: "HD", stats: "🔗 via vkr" }
      };
    }
  } catch (e) { warn(`[facebook/vkr] ${e.message}`); }

  throw new Error("Facebook: all methods failed — video may be private");
}

/* ═══════════════════════════════════════════════════════════════════
   INSTAGRAM
   ═══════════════════════════════════════════════════════════════════ */
async function downloadInstagram(url) {
  /* 1) vidly */
  const buf = await tryVidly(url);
  if (buf && buf.length > 10000) {
    return {
      buffer: buf, ext: ".mp4",
      meta: { site: "Instagram", icon: "📷", title: "Instagram Media", quality: "HD", stats: "🔗 via vidly" }
    };
  }

  /* 2) btch */
  const btchUrl = await tryBtch(["instagram", "igdl", "ig", "instagramdl"], url);
  if (btchUrl) {
    const { buffer, ext } = await fetchBuffer(btchUrl, 90000, 50, ".mp4");
    return {
      buffer, ext,
      meta: { site: "Instagram", icon: "📷", title: "Instagram Media", quality: "HD", stats: "🔗 via btch" }
    };
  }

  /* 3) nayan */
  const nayanUrl = await tryNayan(["ndown", "instagram", "ig"], url);
  if (nayanUrl) {
    const { buffer, ext } = await fetchBuffer(nayanUrl, 90000, 50, ".mp4");
    return {
      buffer, ext,
      meta: { site: "Instagram", icon: "📷", title: "Instagram Media", quality: "HD", stats: "🔗 via nayan" }
    };
  }

  throw new Error("Instagram download failed — post may be private");
}

/* ═══════════════════════════════════════════════════════════════════
   YOUTUBE
   ═══════════════════════════════════════════════════════════════════ */
async function downloadYouTube(url) {
  const vid = (url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1];
  if (!vid) throw new Error("Invalid YouTube URL");

  /* 1) btch */
  const btchUrl = await tryBtch(["youtube", "ytmp4", "yt", "ytdl", "youtubedl"], url);
  if (btchUrl) {
    const { buffer, ext } = await fetchBuffer(btchUrl, 180000, 50, ".mp4");
    return {
      buffer, ext,
      meta: { site: "YouTube", icon: "▶️", title: `YouTube Video (${vid})`, quality: "HD 720p", stats: "🔗 via btch" }
    };
  }

  /* 2) nayan */
  const nayanUrl = await tryNayan(["ndown", "youtube", "yt"], url);
  if (nayanUrl) {
    const { buffer, ext } = await fetchBuffer(nayanUrl, 180000, 50, ".mp4");
    return {
      buffer, ext,
      meta: { site: "YouTube", icon: "▶️", title: `YouTube Video (${vid})`, quality: "HD", stats: "🔗 via nayan" }
    };
  }

  /* 3) vidly */
  const buf = await tryVidly(url);
  if (buf && buf.length > 10000) {
    return {
      buffer: buf, ext: ".mp4",
      meta: { site: "YouTube", icon: "▶️", title: `YouTube Video (${vid})`, quality: "HD", stats: "🔗 via vidly" }
    };
  }

  /* 4) thumbnail fallback */
  try {
    const r = await axios.get("https://www.youtube.com/oembed", {
      params: { url: `https://www.youtube.com/watch?v=${vid}`, format: "json" },
      timeout: 15000
    });
    const { buffer, ext } = await fetchBuffer(r.data.thumbnail_url, 30000, 10, ".jpg");
    return {
      buffer, ext,
      meta: {
        site: "YouTube",
        icon: "▶️",
        title: formatTitle(r.data.title),
        author: r.data.author_name,
        quality: "Thumbnail (video DL blocked)",
        stats: `🔗 https://youtu.be/${vid}`
      }
    };
  } catch (_) {}

  throw new Error("YouTube download failed");
}

/* ═══════════════════════════════════════════════════════════════════
   TWITTER/X
   ═══════════════════════════════════════════════════════════════════ */
async function downloadTwitter(url) {
  const btchUrl = await tryBtch(["twitter", "twdl", "tw", "x", "twitterdl"], url);
  if (btchUrl) {
    const { buffer, ext } = await fetchBuffer(btchUrl, 90000, 50, ".mp4");
    return {
      buffer, ext,
      meta: { site: "Twitter/X", icon: "🐦", title: "Twitter Video", quality: "HD", stats: "🔗 via btch" }
    };
  }

  const nayanUrl = await tryNayan(["ndown", "twitter", "tw"], url);
  if (nayanUrl) {
    const { buffer, ext } = await fetchBuffer(nayanUrl, 90000, 50, ".mp4");
    return {
      buffer, ext,
      meta: { site: "Twitter/X", icon: "🐦", title: "Twitter Video", quality: "HD", stats: "🔗 via nayan" }
    };
  }

  const buf = await tryVidly(url);
  if (buf && buf.length > 10000) {
    return {
      buffer: buf, ext: ".mp4",
      meta: { site: "Twitter/X", icon: "🐦", title: "Twitter Video", quality: "HD", stats: "🔗 via vidly" }
    };
  }

  throw new Error("Twitter/X download failed");
}

/* ═══════════════════════════════════════════════════════════════════
   PINTEREST
   ═══════════════════════════════════════════════════════════════════ */
async function downloadPinterest(url) {
  const r = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000
  });
  const vidMatch = r.data.match(/<meta[^>]+property="og:video"[^>]+content="([^"]+)"/i);
  const imgMatch = r.data.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
  const mediaUrl = (vidMatch && vidMatch[1]) || (imgMatch && imgMatch[1]);
  if (!mediaUrl) throw new Error("No media found");
  const { buffer, ext } = await fetchBuffer(mediaUrl, 40000, 30, vidMatch ? ".mp4" : ".jpg");
  return {
    buffer, ext,
    meta: { site: "Pinterest", icon: "📌", title: "Pinterest Media", quality: vidMatch ? "Video" : "Image (HQ)" }
  };
}

/* ═══════════════════════════════════════════════════════════════════
   THREADS
   ═══════════════════════════════════════════════════════════════════ */
async function downloadThreads(url) {
  const r = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000
  });
  const vidMatch = r.data.match(/<meta[^>]+property="og:video"[^>]+content="([^"]+)"/i);
  const imgMatch = r.data.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
  const mediaUrl = (vidMatch && vidMatch[1]) || (imgMatch && imgMatch[1]);
  if (!mediaUrl) throw new Error("No media found");
  const { buffer, ext } = await fetchBuffer(mediaUrl, 40000, 30, vidMatch ? ".mp4" : ".jpg");
  return {
    buffer, ext,
    meta: { site: "Threads", icon: "🧵", title: "Threads Media", quality: vidMatch ? "Video" : "Image (HQ)" }
  };
}

/* ═══════════════════════════════════════════════════════════════════
   CAPCUT
   ═══════════════════════════════════════════════════════════════════ */
async function downloadCapCut(url) {
  const btchUrl = await tryBtch(["capcut", "capcutdl"], url);
  if (btchUrl) {
    const { buffer, ext } = await fetchBuffer(btchUrl, 120000, 50, ".mp4");
    return {
      buffer, ext,
      meta: { site: "CapCut", icon: "🎬", title: "CapCut Template", quality: "HD", stats: "🔗 via btch" }
    };
  }
  try {
    const r = await axios.get(
      `https://vkrdownloader.org/server/?api_key=vkrdownloader&vkr=${encodeURIComponent(url)}`,
      { timeout: 30000 }
    );
    const u = pickUrl(r.data);
    if (u) {
      const { buffer, ext } = await fetchBuffer(u, 120000, 50, ".mp4");
      return {
        buffer, ext,
        meta: { site: "CapCut", icon: "🎬", title: "CapCut Template", quality: "HD", stats: "🔗 via vkr" }
      };
    }
  } catch (_) {}
  throw new Error("CapCut download failed");
}

/* ═══════════════════════════════════════════════════════════════════
   SOUNDCLOUD
   ═══════════════════════════════════════════════════════════════════ */
async function downloadSoundCloud(url) {
  const r = await axios.get("https://soundcloud.com/oembed", {
    params: { url, format: "json" }, timeout: 15000
  });
  return {
    buffer: null,
    meta: {
      site: "SoundCloud",
      icon: "🎵",
      title: formatTitle(r.data.title),
      author: r.data.author_name,
      quality: "Info only (direct DL blocked)",
      stats: `🔗 ${url}`
    }
  };
}

/* ═══════════════════════════════════════════════════════════════════
   SPOTIFY
   ═══════════════════════════════════════════════════════════════════ */
async function downloadSpotify(url) {
  const r = await axios.get("https://open.spotify.com/oembed", {
    params: { url }, timeout: 15000
  });
  const { buffer, ext } = await fetchBuffer(r.data.thumbnail_url, 30000, 10, ".jpg");
  return {
    buffer, ext,
    meta: {
      site: "Spotify",
      icon: "🎧",
      title: formatTitle(r.data.title),
      author: r.data.author_name,
      quality: "Cover Art (HQ)"
    }
  };
}

/* ═══════════════════════════════════════════════════════════════════
   GOOGLE DRIVE
   ═══════════════════════════════════════════════════════════════════ */
async function downloadGDrive(url) {
  const id = (url.match(/[-\w]{25,}/) || [])[0];
  if (!id) throw new Error("Invalid Google Drive URL");
  const dlUrl = `https://drive.google.com/uc?export=download&id=${id}`;
  const { buffer, ext } = await fetchBuffer(dlUrl, 150000, 50);
  return {
    buffer, ext,
    meta: { site: "Google Drive", icon: "📁", title: "Google Drive File", quality: "Original" }
  };
}

/* ═══════════════════════════════════════════════════════════════════
   MEDIAFIRE
   ═══════════════════════════════════════════════════════════════════ */
async function downloadMediaFire(url) {
  const r = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000
  });
  const match = r.data.match(/href="(https:\/\/download[^"]+)"/);
  if (!match) throw new Error("Could not extract link");
  return {
    buffer: null,
    meta: {
      site: "MediaFire",
      icon: "📁",
      title: "MediaFire File",
      quality: "Link only",
      stats: `🔗 ${match[1]}`
    }
  };
}

/* ═══════════════════════════════════════════════════════════════════
   ROUTES
   ═══════════════════════════════════════════════════════════════════ */
const ROUTES = [
  { name: "TikTok",     pattern: /tiktok\.com|vt\.tiktok|vm\.tiktok/i,   handler: downloadTikTok },
  { name: "Facebook",   pattern: /facebook\.com|fb\.watch|fb\.com/i,      handler: downloadFacebook },
  { name: "Instagram",  pattern: /instagram\.com|instagr\.am|ig\.me/i,    handler: downloadInstagram },
  { name: "YouTube",    pattern: /youtube\.com|youtu\.be/i,               handler: downloadYouTube },
  { name: "Twitter/X",  pattern: /twitter\.com|(^|[^a-z])x\.com|t\.co/i, handler: downloadTwitter },
  { name: "Pinterest",  pattern: /pinterest\.com|pin\.it/i,               handler: downloadPinterest },
  { name: "Threads",    pattern: /threads\.net|threads\.com/i,            handler: downloadThreads },
  { name: "CapCut",     pattern: /capcut\.com|capcut\.app/i,              handler: downloadCapCut },
  { name: "SoundCloud", pattern: /soundcloud\.com/i,                      handler: downloadSoundCloud },
  { name: "Spotify",    pattern: /open\.spotify\.com|spotify\.link/i,     handler: downloadSpotify },
  { name: "Drive",      pattern: /drive\.google\.com|docs\.google\.com/i, handler: downloadGDrive },
  { name: "MediaFire",  pattern: /mediafire\.com/i,                       handler: downloadMediaFire }
];

function findHandler(url) {
  for (const r of ROUTES) if (r.pattern.test(url)) return r;
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   REACTION HELPER
   ═══════════════════════════════════════════════════════════════════ */
function react(api, emoji, messageID, threadID) {
  return new Promise((resolve) => {
    if (!messageID || !threadID) return resolve(false);
    try {
      api.setMessageReaction(emoji, messageID, threadID, (err) => resolve(!err));
    } catch (_) { resolve(false); }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   CAPTION BUILDER
   ═══════════════════════════════════════════════════════════════════ */
function buildCaption(meta, durationMs, sizeBytes, footer) {
  const lines = [];
  lines.push(`╭─────────────────────────╮`);
  lines.push(`     ⬇️  DOWNLOAD COMPLETE`);
  lines.push(`╰─────────────────────────╯`);
  lines.push(``);
  lines.push(`${meta.icon}  Source: ${meta.site}`);
  if (meta.title) {
    lines.push(``);
    lines.push(`📌  ${meta.title}`);
  }
  if (meta.author) lines.push(`✍️  ${meta.author}`);
  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
  const infoLine = [];
  if (meta.quality) infoLine.push(`💎 ${meta.quality}`);
  if (sizeBytes) infoLine.push(`📦 ${formatSize(sizeBytes)}`);
  if (infoLine.length) lines.push(infoLine.join(`   •   `));
  lines.push(`⚡ Downloaded in ${formatDuration(durationMs)}`);
  if (meta.stats) lines.push(`${meta.stats}`);
  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`  ✨ ${footer} ✨`);
  return lines.join(`\n`);
}

/* ═══════════════════════════════════════════════════════════════════
   SINGLE URL PROCESSOR
   ═══════════════════════════════════════════════════════════════════ */
async function processOneUrl(api, threadID, url, footer) {
  const startedAt = Date.now();
  const route = findHandler(url);
  if (!route) return { ok: false, url, error: "Unsupported link" };

  log(`[route] ${route.name} ← ${url.slice(0, 90)}`);

  let result;
  try {
    result = await route.handler(url);
  } catch (e) {
    errl(`[${route.name}] ${e.message}`);
    return { ok: false, url, error: e.message, site: route.name };
  }

  const durationMs = Date.now() - startedAt;

  /* Info-only (no buffer) */
  if (!result.buffer) {
    const caption = buildCaption(result.meta, durationMs, null, footer);
    try { await api.sendMessage(caption, threadID); } catch (_) {}
    return { ok: true, url, site: route.name, info: true };
  }

  /* Write temp + send */
  const ext = result.ext || ".mp4";
  const tmpPath = path.join(os.tmpdir(), `nexus_dl_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);

  try {
    await fs.writeFile(tmpPath, result.buffer);
    const caption = buildCaption(result.meta, durationMs, result.buffer.length, footer);

    await new Promise((resolve) => {
      api.sendMessage({
        body: caption,
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => resolve());
    });

    return { ok: true, url, site: route.name, size: result.buffer.length };
  } finally {
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN MODULE
   ═══════════════════════════════════════════════════════════════════ */
module.exports = {
  name: "autodl",
  aliases: ["autodownload", "adl", "dl"],
  version: "11.0.0",
  role: 0,
  description: "Auto-download from any supported link (multi-link support)",
  usage: "/autodl <url...> | /autodl on|off | just paste links",
  autoDownload: true,
  patterns: [
    /tiktok\.com|vt\.tiktok|vm\.tiktok/i,
    /facebook\.com|fb\.watch|fb\.com/i,
    /instagram\.com|instagr\.am|ig\.me/i,
    /youtube\.com|youtu\.be/i,
    /twitter\.com|(^|[^a-z])x\.com|t\.co/i,
    /pinterest\.com|pin\.it/i,
    /threads\.net|threads\.com/i,
    /capcut\.com|capcut\.app/i,
    /soundcloud\.com/i,
    /open\.spotify\.com|spotify\.link/i,
    /drive\.google\.com|docs\.google\.com/i,
    /mediafire\.com/i
  ],

  execute: async function (api, event, args, db, config) {
    const { threadID, senderID, body, messageID } = event;
    const FOOTER = "Powered by Shihab";

    /* ═══ on / off toggle ═══ */
    const firstArg = (args && args[0]) ? String(args[0]).toLowerCase() : "";
    if (firstArg === "on" || firstArg === "off") {
      if (!event.isGroup) {
        return api.sendMessage(`⚠️ Groups only.\n\n✨ ${FOOTER} ✨`, threadID);
      }
      const g = await db.getGroup(threadID);
      g.settings.autoDownload = (firstArg === "on");
      await g.save();
      db.cache.set(`group_${threadID}`, g, 30);
      return api.sendMessage(
        `📥 Auto-download: ${g.settings.autoDownload ? "ON ✅" : "OFF ❌"}\n\n✨ ${FOOTER} ✨`,
        threadID
      );
    }

    /* ═══ Extract ALL URLs from body (works for command + auto-trigger) ═══ */
    const matches = String(body || "").match(/https?:\/\/[^\s]+/gi) || [];
    const cleaned = matches.map((u) => u.replace(/[),.;:!?]+$/, ""));
    const unique = [...new Set(cleaned)];

    const supported = unique.filter((u) => findHandler(u));
    const unsupported = unique.filter((u) => !findHandler(u));

    /* ═══ No URLs → help ═══ */
    if (!unique.length) {
      return api.sendMessage(
        `╭─────────────────────────╮\n` +
        `   📥 AUTO DOWNLOADER\n` +
        `╰─────────────────────────╯\n\n` +
        `Just paste any link — no command needed.\n\n` +
        `✅ TikTok\n✅ Facebook\n✅ Instagram\n✅ YouTube\n✅ Twitter/X\n✅ Pinterest\n✅ Threads\n✅ CapCut\n✅ SoundCloud\n✅ Spotify\n✅ Google Drive\n✅ MediaFire\n\n` +
        `📌 Multi-link: max ${MAX_LINKS} links per message\n\n` +
        `Toggle: /autodl on|off\n\n✨ ${FOOTER} ✨`,
        threadID
      );
    }

    /* ═══ No supported URLs ═══ */
    if (!supported.length) {
      return api.sendMessage(
        `❓ No supported links found.\n\n✨ ${FOOTER} ✨`,
        threadID
      );
    }

    /* ═══ Enforce max ═══ */
    const toProcess = supported.slice(0, MAX_LINKS);
    const overflow = supported.length - toProcess.length;

    /* ═══ Notify if multiple ═══ */
    if (toProcess.length > 1) {
      try {
        api.sendMessage(
          `📥 Processing ${toProcess.length} links...\n` +
          (overflow > 0 ? `⚠️ ${overflow} extra link(s) skipped (max ${MAX_LINKS})\n` : "") +
          `\n✨ ${FOOTER} ✨`,
          threadID
        );
      } catch (_) {}
    }

    if (messageID) await react(api, "⏳", messageID, threadID);

    /* ═══ Process sequentially ═══ */
    const results = { ok: 0, failed: 0, info: 0 };

    for (let i = 0; i < toProcess.length; i++) {
      const url = toProcess[i];
      try {
        log(`[multi] (${i + 1}/${toProcess.length}) ${url.slice(0, 80)}`);
        const r = await processOneUrl(api, threadID, url, FOOTER);

        if (r.ok) {
          if (r.info) results.info++;
          else results.ok++;
        } else {
          results.failed++;
          try {
            api.sendMessage(
              `❌ Failed: ${r.site || "Unknown"}\n` +
              `📌 ${url.slice(0, 80)}\n` +
              `💬 ${String(r.error).slice(0, 100)}\n\n` +
              `✨ ${FOOTER} ✨`,
              threadID
            );
          } catch (_) {}
        }
      } catch (e) {
        errl(`[multi] unexpected: ${e.message}`);
        results.failed++;
      }

      /* Delay between links */
      if (i < toProcess.length - 1) await sleep(1500);
    }

    /* ═══ Final reaction ═══ */
    if (messageID) {
      if (results.failed === 0) await react(api, "✅", messageID, threadID);
      else if (results.ok + results.info > 0) await react(api, "⚠️", messageID, threadID);
      else await react(api, "❌", messageID, threadID);
    }

    /* ═══ Batch summary ═══ */
    if (toProcess.length > 1) {
      const summary = [
        `╭─────────────────────────╮`,
        `   📊 BATCH SUMMARY`,
        `╰─────────────────────────╯`,
        ``,
        `✅ Success: ${results.ok}`,
        `ℹ️ Info only: ${results.info}`,
        `❌ Failed: ${results.failed}`,
        ``,
        `✨ ${FOOTER} ✨`
      ].join("\n");
      try { api.sendMessage(summary, threadID); } catch (_) {}
    }

    /* ═══ Unsupported warning ═══ */
    if (unsupported.length) {
      try {
        api.sendMessage(
          `⚠️ ${unsupported.length} unsupported link(s) ignored.`,
          threadID
        );
      } catch (_) {}
    }
  }
};
// Powered by Shihab