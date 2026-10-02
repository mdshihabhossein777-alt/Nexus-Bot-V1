// commands/download/autodl.js - NEXUS V1 - 2026 Working APIs
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ⚡ LOCAL LOG HELPERS */
const log  = (...a) => console.log("[NEXUS/autodl]", ...a);
const warn = (...a) => console.warn("[NEXUS/autodl]", ...a);
const errl = (...a) => console.error("[NEXUS/autodl]", ...a);

/* ---------- Download Libraries (2026) ---------- */
let btch, nayan, vidly, fdown;
try { btch = require("btch-downloader"); } catch (_) {}
try { nayan = require("nayan-media-downloaders"); } catch (_) {}
try { vidly = require("@raihan07/vidly"); } catch (_) {}
try { fdown = require("fdown-downloader"); } catch (_) {}

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

/* Helper: try multiple endpoints in order */
async function tryEndpoints(endpoints, label) {
  for (const ep of endpoints) {
    try {
      log(`[${label}] trying ${ep.name}...`);
      const result = await ep.call();
      if (result && typeof result === "string" && result.startsWith("http")) {
        log(`[${label}] ✓ ${ep.name} success`);
        return { url: result, api: ep.name };
      }
      if (result && typeof result === "object" && result.url) {
        log(`[${label}] ✓ ${ep.name} success`);
        return { url: result.url, api: ep.name, extra: result };
      }
    } catch (e) {
      warn(`[${label}] ${ep.name} failed: ${e.message}`);
    }
  }
  return null;
}

/* ================================================================
   TIKTOK — TikWM (most reliable)
   ================================================================ */
async function downloadTikTok(url) {
  const endpoints = [
    {
      name: "tikwm",
      call: async () => {
        const r = await axios.get("https://www.tikwm.com/api/", {
          params: { url, hd: 1 },
          timeout: 25000
        });
        const d = r.data?.data;
        if (!d || !d.play) return null;
        const videoUrl = d.play.startsWith("http") ? d.play : "https://www.tikwm.com" + d.play;
        return {
          url: videoUrl,
          title: d.title,
          author: d.author?.unique_id ? `@${d.author.unique_id}` : null,
          quality: d.hd ? "HD 720p" : "SD 480p",
          stats: `❤️ ${d.digg_count || 0}  💬 ${d.comment_count || 0}  ↪️ ${d.share_count || 0}`
        };
      }
    }
  ];

  const res = await tryEndpoints(endpoints, "tiktok");
  if (!res) throw new Error("TikTok download failed. Link may be invalid.");

  const extra = res.extra || {};
  const { buffer, ext } = await fetchBuffer(res.url, 90000, 50, ".mp4");

  return {
    buffer, ext,
    meta: {
      site: "TikTok",
      icon: "🎵",
      title: formatTitle(extra.title),
      author: extra.author,
      quality: extra.quality || "HD",
      stats: extra.stats || null
    }
  };
}

/* ================================================================
   FACEBOOK — 2026 Working Libraries (btch, nayan, vidly, fdown)
   ================================================================ */
async function downloadFacebook(url) {
  const endpoints = [
    /* ⭐ 1. btch-downloader fbdown */
    {
      name: "btch-fbdown",
      call: async () => {
        if (!btch || !btch.fbdown) return null;
        const res = await btch.fbdown(url);
        return res?.url || res?.hd || res?.sd || (res?.result && (res.result.hd || res.result.sd));
      }
    },
    /* ⭐ 2. nayan-media-downloader ndown */
    {
      name: "nayan-ndown",
      call: async () => {
        if (!nayan || !nayan.ndown) return null;
        const res = await nayan.ndown(url);
        return res?.url || res?.video || res?.download_url || (res?.data && (res.data.url || res.data.hd));
      }
    },
    /* ⭐ 3. @raihan07/vidly */
    {
      name: "vidly",
      call: async () => {
        if (!vidly || !vidly.downloadVideo) return null;
        const tmpOut = path.join(os.tmpdir(), `vidly_${Date.now()}.mp4`);
        const res = await vidly.downloadVideo(url, tmpOut);
        if (res && res.filePath && fs.existsSync(res.filePath)) {
          const buf = await fs.readFile(res.filePath);
          try { fs.unlinkSync(res.filePath); } catch (_) {}
          return { url: buf }; // special case - direct buffer
        }
        return null;
      },
      isBuffer: true
    },
    /* ⭐ 4. fdown-downloader */
    {
      name: "fdown",
      call: async () => {
        if (!fdown) return null;
        const Fdown = fdown.FDownDownloader || fdown.default || fdown;
        if (typeof Fdown !== "function") return null;
        const inst = new Fdown();
        const res = await (inst.download ? inst.download(url) : inst(url));
        return res?.url || res?.hd || res?.sd || res;
      }
    },
    /* ⭐ 5. VKrDownloader direct HTTP */
    {
      name: "vkrdownloader",
      call: async () => {
        const r = await axios.get(
          `https://vkrdownloader.org/server/?api_key=vkrdownloader&vkr=${encodeURIComponent(url)}`,
          { timeout: 30000, headers: { "Accept": "application/json" } }
        );
        const d = r.data;
        return d?.source || (d?.formats && d.formats[0]?.url) || (d?.data && (d.data.source || d.data.url));
      }
    }
  ];

  /* Handle special buffer-returning endpoints */
  for (const ep of endpoints) {
    try {
      log(`[facebook] trying ${ep.name}...`);

      if (ep.isBuffer) {
        const res = await ep.call();
        if (res && res.url && Buffer.isBuffer(res.url)) {
          log(`[facebook] ✓ ${ep.name} success (buffer)`);
          return {
            buffer: res.url,
            ext: ".mp4",
            meta: {
              site: "Facebook",
              icon: "📘",
              title: "Facebook Video",
              quality: "HD Quality",
              stats: `🔗 via ${ep.name}`
            }
          };
        }
        continue;
      }

      const u = await ep.call();
      if (u && typeof u === "string" && u.startsWith("http")) {
        log(`[facebook] ✓ ${ep.name} success`);
        const { buffer, ext } = await fetchBuffer(u, 120000, 50, ".mp4");
        return {
          buffer, ext,
          meta: {
            site: "Facebook",
            icon: "📘",
            title: "Facebook Video",
            quality: "HD Quality",
            stats: `🔗 via ${ep.name}`
          }
        };
      }
    } catch (e) {
      warn(`[facebook] ${ep.name} failed: ${e.message}`);
    }
  }

  throw new Error("Facebook: All download methods failed. Video may be private.");
}

/* ================================================================
   INSTAGRAM — btch, nayan, vidly
   ================================================================ */
async function downloadInstagram(url) {
  const endpoints = [
    {
      name: "btch-igdl",
      call: async () => {
        if (!btch || !btch.igdl) return null;
        const res = await btch.igdl(url);
        const items = res?.result || res?.data || res;
        if (Array.isArray(items) && items.length) {
          return items[0].url || items[0].download_url;
        }
        return res?.url || res?.video_url || res?.image_url;
      }
    },
    {
      name: "nayan-ndown",
      call: async () => {
        if (!nayan || !nayan.ndown) return null;
        const res = await nayan.ndown(url);
        return res?.url || res?.video || res?.download_url || (res?.data && (res.data.url || res.data.video));
      }
    },
    {
      name: "vidly",
      call: async () => {
        if (!vidly || !vidly.downloadVideo) return null;
        const tmpOut = path.join(os.tmpdir(), `vidly_ig_${Date.now()}.mp4`);
        const res = await vidly.downloadVideo(url, tmpOut);
        if (res && res.filePath && fs.existsSync(res.filePath)) {
          const buf = await fs.readFile(res.filePath);
          try { fs.unlinkSync(res.filePath); } catch (_) {}
          return { url: buf };
        }
        return null;
      },
      isBuffer: true
    }
  ];

  for (const ep of endpoints) {
    try {
      log(`[instagram] trying ${ep.name}...`);
      if (ep.isBuffer) {
        const res = await ep.call();
        if (res && res.url && Buffer.isBuffer(res.url)) {
          log(`[instagram] ✓ ${ep.name} success`);
          return {
            buffer: res.url,
            ext: ".mp4",
            meta: { site: "Instagram", icon: "📷", title: "Instagram Media", quality: "HD" }
          };
        }
        continue;
      }
      const u = await ep.call();
      if (u && typeof u === "string" && u.startsWith("http")) {
        log(`[instagram] ✓ ${ep.name} success`);
        const { buffer, ext } = await fetchBuffer(u, 90000, 50, ".mp4");
        return {
          buffer, ext,
          meta: { site: "Instagram", icon: "📷", title: "Instagram Media", quality: "HD" }
        };
      }
    } catch (e) {
      warn(`[instagram] ${ep.name} failed: ${e.message}`);
    }
  }

  throw new Error("Instagram download failed. Post may be private.");
}

/* ================================================================
   YOUTUBE — btch, nayan, vidly
   ================================================================ */
async function downloadYouTube(url) {
  const vid = (url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1];
  if (!vid) throw new Error("Invalid YouTube URL.");

  const endpoints = [
    {
      name: "btch-ytmp4",
      call: async () => {
        if (!btch || !btch.youtube) return null;
        const res = await btch.youtube(url);
        return res?.url || res?.mp4 || res?.video || (res?.result && (res.result.url || res.result.mp4));
      }
    },
    {
      name: "nayan-ndown",
      call: async () => {
        if (!nayan || !nayan.ndown) return null;
        const res = await nayan.ndown(url);
        return res?.url || res?.video || res?.download_url;
      }
    },
    {
      name: "vidly",
      call: async () => {
        if (!vidly || !vidly.downloadVideo) return null;
        const tmpOut = path.join(os.tmpdir(), `vidly_yt_${Date.now()}.mp4`);
        const res = await vidly.downloadVideo(url, tmpOut);
        if (res && res.filePath && fs.existsSync(res.filePath)) {
          const buf = await fs.readFile(res.filePath);
          try { fs.unlinkSync(res.filePath); } catch (_) {}
          return { url: buf };
        }
        return null;
      },
      isBuffer: true
    }
  ];

  for (const ep of endpoints) {
    try {
      log(`[youtube] trying ${ep.name}...`);
      if (ep.isBuffer) {
        const res = await ep.call();
        if (res && res.url && Buffer.isBuffer(res.url)) {
          log(`[youtube] ✓ ${ep.name} success`);
          return {
            buffer: res.url,
            ext: ".mp4",
            meta: {
              site: "YouTube",
              icon: "▶️",
              title: `YouTube Video (${vid})`,
              quality: "HD",
              stats: `🔗 via ${ep.name}`
            }
          };
        }
        continue;
      }
      const u = await ep.call();
      if (u && typeof u === "string" && u.startsWith("http")) {
        log(`[youtube] ✓ ${ep.name} success`);
        const { buffer, ext } = await fetchBuffer(u, 180000, 50, ".mp4");
        return {
          buffer, ext,
          meta: {
            site: "YouTube",
            icon: "▶️",
            title: `YouTube Video (${vid})`,
            quality: "HD 720p",
            stats: `🔗 via ${ep.name}`
          }
        };
      }
    } catch (e) {
      warn(`[youtube] ${ep.name} failed: ${e.message}`);
    }
  }

  /* Fallback: thumbnail */
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
      quality: "Thumbnail (direct DL blocked)",
      stats: `🔗 https://youtu.be/${vid}`
    }
  };
}

/* ================================================================
   TWITTER/X — btch, nayan, vidly
   ================================================================ */
async function downloadTwitter(url) {
  const endpoints = [
    {
      name: "btch-twitter",
      call: async () => {
        if (!btch || !btch.twitter) return null;
        const res = await btch.twitter(url);
        return res?.url || res?.video || (res?.result && (res.result.url || res.result.hd));
      }
    },
    {
      name: "nayan-ndown",
      call: async () => {
        if (!nayan || !nayan.ndown) return null;
        const res = await nayan.ndown(url);
        return res?.url || res?.video || res?.download_url;
      }
    },
    {
      name: "vidly",
      call: async () => {
        if (!vidly || !vidly.downloadVideo) return null;
        const tmpOut = path.join(os.tmpdir(), `vidly_tw_${Date.now()}.mp4`);
        const res = await vidly.downloadVideo(url, tmpOut);
        if (res && res.filePath && fs.existsSync(res.filePath)) {
          const buf = await fs.readFile(res.filePath);
          try { fs.unlinkSync(res.filePath); } catch (_) {}
          return { url: buf };
        }
        return null;
      },
      isBuffer: true
    }
  ];

  for (const ep of endpoints) {
    try {
      log(`[twitter] trying ${ep.name}...`);
      if (ep.isBuffer) {
        const res = await ep.call();
        if (res && res.url && Buffer.isBuffer(res.url)) {
          log(`[twitter] ✓ ${ep.name} success`);
          return {
            buffer: res.url,
            ext: ".mp4",
            meta: { site: "Twitter/X", icon: "🐦", title: "Twitter Video", quality: "HD" }
          };
        }
        continue;
      }
      const u = await ep.call();
      if (u && typeof u === "string" && u.startsWith("http")) {
        log(`[twitter] ✓ ${ep.name} success`);
        const { buffer, ext } = await fetchBuffer(u, 90000, 50, ".mp4");
        return {
          buffer, ext,
          meta: { site: "Twitter/X", icon: "🐦", title: "Twitter Video", quality: "HD" }
        };
      }
    } catch (e) {
      warn(`[twitter] ${ep.name} failed: ${e.message}`);
    }
  }

  throw new Error("Twitter/X download failed.");
}

/* ================================================================
   PINTEREST — Meta tag scrape
   ================================================================ */
async function downloadPinterest(url) {
  const r = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000
  });
  const vidMatch = r.data.match(/<meta[^>]+property="og:video"[^>]+content="([^"]+)"/i);
  const imgMatch = r.data.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
  const mediaUrl = (vidMatch && vidMatch[1]) || (imgMatch && imgMatch[1]);
  if (!mediaUrl) throw new Error("No media found.");
  const { buffer, ext } = await fetchBuffer(mediaUrl, 40000, 30, vidMatch ? ".mp4" : ".jpg");
  return {
    buffer, ext,
    meta: { site: "Pinterest", icon: "📌", title: "Pinterest Media", quality: vidMatch ? "Video" : "Image (HQ)" }
  };
}

/* ================================================================
   THREADS — Meta tag scrape
   ================================================================ */
async function downloadThreads(url) {
  const r = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000
  });
  const vidMatch = r.data.match(/<meta[^>]+property="og:video"[^>]+content="([^"]+)"/i);
  const imgMatch = r.data.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
  const mediaUrl = (vidMatch && vidMatch[1]) || (imgMatch && imgMatch[1]);
  if (!mediaUrl) throw new Error("No media found.");
  const { buffer, ext } = await fetchBuffer(mediaUrl, 40000, 30, vidMatch ? ".mp4" : ".jpg");
  return {
    buffer, ext,
    meta: { site: "Threads", icon: "🧵", title: "Threads Media", quality: vidMatch ? "Video" : "Image (HQ)" }
  };
}

/* ================================================================
   CAPCUT — btch
   ================================================================ */
async function downloadCapCut(url) {
  const endpoints = [
    {
      name: "btch-capcut",
      call: async () => {
        if (!btch || !btch.capcut) return null;
        const res = await btch.capcut(url);
        return res?.url || res?.video || (res?.result && res.result.url);
      }
    },
    {
      name: "vkrdownloader",
      call: async () => {
        const r = await axios.get(
          `https://vkrdownloader.org/server/?api_key=vkrdownloader&vkr=${encodeURIComponent(url)}`,
          { timeout: 30000 }
        );
        return r.data?.source || (r.data?.formats && r.data.formats[0]?.url);
      }
    }
  ];

  const res = await tryEndpoints(endpoints, "capcut");
  if (!res) throw new Error("CapCut download failed.");
  const { buffer, ext } = await fetchBuffer(res.url, 120000, 50, ".mp4");
  return {
    buffer, ext,
    meta: { site: "CapCut", icon: "🎬", title: "CapCut Template Video", quality: "HD Quality" }
  };
}

/* ================================================================
   SOUNDCLOUD — Info only
   ================================================================ */
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
      quality: "Info only",
      stats: `🔗 ${url}`
    }
  };
}

/* ================================================================
   SPOTIFY — Cover Art
   ================================================================ */
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

/* ================================================================
   GOOGLE DRIVE — Direct download
   ================================================================ */
async function downloadGDrive(url) {
  const id = (url.match(/[-\w]{25,}/) || [])[0];
  if (!id) throw new Error("Invalid Google Drive URL.");
  const dlUrl = `https://drive.google.com/uc?export=download&id=${id}`;
  const { buffer, ext } = await fetchBuffer(dlUrl, 150000, 50);
  return {
    buffer, ext,
    meta: { site: "Google Drive", icon: "📁", title: "Google Drive File", quality: "Original" }
  };
}

/* ================================================================
   MEDIAFIRE — Link extraction
   ================================================================ */
async function downloadMediaFire(url) {
  const r = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }, timeout: 20000
  });
  const match = r.data.match(/href="(https:\/\/download[^"]+)"/);
  if (!match) throw new Error("Could not extract link.");
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

/* ================================================================
   ROUTES
   ================================================================ */
const ROUTES = [
  { name: "TikTok",     pattern: /tiktok\.com|vt\.tiktok|vm\.tiktok/i,     handler: downloadTikTok },
  { name: "Facebook",   pattern: /facebook\.com|fb\.watch|fb\.com/i,        handler: downloadFacebook },
  { name: "Instagram",  pattern: /instagram\.com|instagr\.am|ig\.me/i,      handler: downloadInstagram },
  { name: "YouTube",    pattern: /youtube\.com|youtu\.be/i,                 handler: downloadYouTube },
  { name: "Twitter/X",  pattern: /twitter\.com|(^|[^a-z])x\.com|t\.co/i,   handler: downloadTwitter },
  { name: "Pinterest",  pattern: /pinterest\.com|pin\.it/i,                 handler: downloadPinterest },
  { name: "Threads",    pattern: /threads\.net|threads\.com/i,              handler: downloadThreads },
  { name: "CapCut",     pattern: /capcut\.com|capcut\.app/i,                handler: downloadCapCut },
  { name: "SoundCloud", pattern: /soundcloud\.com/i,                        handler: downloadSoundCloud },
  { name: "Spotify",    pattern: /open\.spotify\.com|spotify\.link/i,       handler: downloadSpotify },
  { name: "Drive",      pattern: /drive\.google\.com|docs\.google\.com/i,   handler: downloadGDrive },
  { name: "MediaFire",  pattern: /mediafire\.com/i,                         handler: downloadMediaFire }
];

function findHandler(url) {
  for (const r of ROUTES) if (r.pattern.test(url)) return r;
  return null;
}

/* ================================================================
   REACTION HELPER
   ================================================================ */
function react(api, emoji, messageID, threadID) {
  return new Promise((resolve) => {
    if (!messageID || !threadID) return resolve(false);
    try {
      api.setMessageReaction(emoji, messageID, threadID, (err) => {
        resolve(!err);
      });
    } catch (e) {
      resolve(false);
    }
  });
}

/* ================================================================
   CAPTION BUILDER
   ================================================================ */
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
  if (meta.author) {
    lines.push(`✍️  ${meta.author}`);
  }

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

/* ================================================================
   MAIN MODULE
   ================================================================ */
module.exports = {
  name: "autodl",
  aliases: ["autodownload", "adl", "dl"],
  version: "10.0.0",
  role: 0,
  description: "Auto-download with 2026 working libraries",
  usage: "/autodl <url> | /autodl on|off | just paste a link",
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
    let tmpPath = null;
    const startedAt = Date.now();
    const FOOTER = "Powered by Shihab";

    try {
      if (args[0] && (args[0].toLowerCase() === "on" || args[0].toLowerCase() === "off")) {
        if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
        const g = await db.getGroup(threadID);
        g.settings.autoDownload = (args[0].toLowerCase() === "on");
        await g.save();
        db.cache.set(`group_${threadID}`, g, 30);
        return api.sendMessage(
          `📥 Auto-download is now ${g.settings.autoDownload ? "ON ✅" : "OFF ❌"}\n\n✨ ${FOOTER} ✨`,
          threadID
        );
      }

      let url = args[0];
      if (!url && body) {
        const m = body.match(/https?:\/\/[^\s]+/i);
        if (m) url = m[0];
      }
      if (!url || !/^https?:\/\//i.test(url)) {
        return api.sendMessage(
          `╭─────────────────────────╮\n` +
          `   📥 AUTO DOWNLOADER\n` +
          `╰─────────────────────────╯\n\n` +
          `Just paste any link — no command needed.\n\n` +
          `✅ TikTok\n✅ Facebook\n✅ Instagram\n✅ YouTube\n✅ Twitter/X\n✅ Pinterest\n✅ Threads\n✅ CapCut\n✅ SoundCloud\n✅ Spotify\n✅ Google Drive\n✅ MediaFire\n\n` +
          `Toggle: /autodl on|off\n\n✨ ${FOOTER} ✨`,
          threadID
        );
      }

      const route = findHandler(url);
      if (!route) return api.sendMessage(`❓ Unsupported link.\n\n✨ ${FOOTER} ✨`, threadID);

      if (messageID && threadID) {
        await react(api, "⏳", messageID, threadID);
      }

      log(`[route] ${route.name} ← ${url.slice(0, 80)}`);

      const result = await route.handler(url);
      const durationMs = Date.now() - startedAt;

      if (messageID && threadID) {
        await react(api, "✅", messageID, threadID);
      }

      if (!result.buffer) {
        const caption = buildCaption(result.meta, durationMs, null, FOOTER);
        return api.sendMessage(caption, threadID);
      }

      const ext = result.ext || ".mp4";
      tmpPath = path.join(os.tmpdir(), `nexus_dl_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
      await fs.writeFile(tmpPath, result.buffer);

      const caption = buildCaption(result.meta, durationMs, result.buffer.length, FOOTER);

      api.sendMessage({
        body: caption,
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      errl(`[${new Date().toISOString()}] error:`, e.message);
      if (messageID && threadID) await react(api, "❌", messageID, threadID);
      api.sendMessage(`❌ Download failed: ${e.message}\n\n✨ ${FOOTER} ✨`, threadID);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    }
  }
};
// Powered by Shihab