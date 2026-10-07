/**
 * commands/ai/sing.js
 * NEXUS BOT V1 — Song search + download + send (FAST)
 * © 2026
 */

"use strict";

const yts = require("yt-search");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const http = require("http");
const https = require("https");
const songSearches = require("../../utils/songStore");

/* ═══ Safe btch-downloader require ═══ */
let btch = null;
try { btch = require("btch-downloader"); } catch (_) {
  console.log("[sing] btch-downloader not available");
}

const TMP_DIR = os.tmpdir();

/* ═══ Constants ═══ */
const MAX_SIZE_MB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/* ═══ Keep-alive agents — TCP connection reuse (BIG speed win) ═══ */
const httpAgent  = new http.Agent({ keepAlive: true, maxSockets: 25 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 25 });

/* ═══ Shared axios client with keep-alive ═══ */
const httpClient = axios.create({
  timeout: 30000,
  httpAgent,
  httpsAgent,
  maxRedirects: 5,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "*/*"
  }
});

/* ═══ Non-blocking react (fire & forget — no await) ═══ */
function reactFast(api, emoji, messageID, threadID) {
  if (!messageID || !threadID) return;
  try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
}

/* Keep old signature working */
function react(api, emoji, messageID, threadID) {
  reactFast(api, emoji, messageID, threadID);
  return Promise.resolve(true);
}

/* ═══ Small search cache (5 min) — avoids repeat yts calls ═══ */
const searchCache = new Map();
const SEARCH_TTL = 5 * 60 * 1000;
function getCachedSearch(q) {
  const e = searchCache.get(q.toLowerCase());
  if (e && Date.now() - e.t < SEARCH_TTL) return e.data;
  if (e) searchCache.delete(q.toLowerCase());
  return null;
}
function setCachedSearch(q, data) {
  searchCache.set(q.toLowerCase(), { data, t: Date.now() });
  if (searchCache.size > 200) searchCache.delete(searchCache.keys().next().value);
}

/* ═══ Find audio URL from any response shape ═══ */
function findAudioUrl(data) {
  if (!data || typeof data !== "object") return null;

  const keys = ["mp3", "audio", "url", "download_url", "downloadUrl", "link", "audioUrl"];
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && /^https?:\/\//.test(v)) return v;
  }

  if (data.result) { const r = findAudioUrl(data.result); if (r) return r; }
  if (data.data) { const r = findAudioUrl(data.data); if (r) return r; }

  if (Array.isArray(data)) {
    for (const item of data) { const r = findAudioUrl(item); if (r) return r; }
  }

  if (Array.isArray(data.medias)) {
    const audio = data.medias.find(
      (m) => m.type === "audio" || m.ext === "m4a" || m.ext === "mp3" || m.vcodec === "none"
    );
    if (audio) {
      const u = audio.url || audio.download_url;
      if (typeof u === "string" && /^https?:\/\//.test(u)) return u;
    }
  }

  return null;
}

/* ═══ btch-downloader — 10s hard timeout ═══ */
async function getAudioUrlBtch(videoId) {
  if (!btch) return null;

  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const errors = [];

  try {
    const fn = btch.youtube || btch.ytmp3 || btch.yt || btch.y2mate;
    if (typeof fn === "function") {
      const data = await Promise.race([
        fn(ytUrl),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000))
      ]);
      const audioUrl = findAudioUrl(data);
      if (audioUrl) {
        console.log("[sing] ✅ btch-downloader");
        return audioUrl;
      }
      errors.push("btch: no url");
    }
  } catch (e) {
    errors.push("btch: " + e.message);
  }

  try {
    for (const fnName of Object.keys(btch)) {
      if (typeof btch[fnName] !== "function") continue;
      if (["youtube", "ytmp3", "yt", "y2mate"].includes(fnName)) continue;
      if (fnName.startsWith("_")) continue;
      try {
        const data = await Promise.race([
          btch[fnName](ytUrl),
          new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000))
        ]);
        const audioUrl = findAudioUrl(data);
        if (audioUrl) {
          console.log(`[sing] ✅ btch.${fnName}`);
          return audioUrl;
        }
      } catch (_) {}
    }
  } catch (_) {}

  return null;
}

/* ═══ yt-dlp fallback — reduced retries (was 3 → 1) ═══ */
async function getAudioUrlYtdlp(videoId) {
  try {
    const { YtDlp } = require("ytdlp-nodejs");
    const ytdlp = new YtDlp();
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const tmpPath = path.join(TMP_DIR, `sing_ytdlp_${Date.now()}.mp3`);

    const cookieCandidates = [
      path.join(__dirname, "..", "..", "cookies.txt"),
      "/opt/render/project/src/cookies.txt",
      "/app/cookies.txt",
      path.join(process.cwd(), "cookies.txt"),
      path.join(TMP_DIR, "yt-cookies.txt")
    ];

    let cookiesPath = null;
    for (const c of cookieCandidates) {
      try { if (fs.existsSync(c)) { cookiesPath = c; break; } } catch (_) {}
    }

    if (!cookiesPath && process.env.YT_COOKIES_B64) {
      try {
        const decoded = Buffer.from(process.env.YT_COOKIES_B64, "base64").toString("utf8");
        const tmp = path.join(TMP_DIR, "yt-cookies.txt");
        fs.writeFileSync(tmp, decoded);
        cookiesPath = tmp;
      } catch (_) {}
    }

    const opts = {
      output: tmpPath,
      audioQuality: "5",
      noWarnings: true,
      noProgress: true,
      retries: 1,             // was 3
      fragmentRetries: 1,     // fail fast
      noPart: true,           // skip .part file rename
      concurrent: true,       // parallel fragments
      extractorArgs: "youtube:player_client=android,ios,web_safari"
    };
    if (cookiesPath) opts.cookies = cookiesPath;

    const result = await ytdlp.downloadAudio(url, "mp3", opts);

    let finalPath = null;
    if (result && result.filePaths && result.filePaths.length) {
      finalPath = result.filePaths[0];
    } else if (fs.existsSync(tmpPath)) {
      finalPath = tmpPath;
    } else {
      const dir = path.dirname(tmpPath);
      const base = path.basename(tmpPath, ".mp3");
      const files = fs.readdirSync(dir).filter((f) => f.startsWith(base));
      if (files.length) finalPath = path.join(dir, files[0]);
    }

    if (!finalPath || !fs.existsSync(finalPath)) return null;

    console.log("[sing] ✅ yt-dlp");
    return { localPath: finalPath };
  } catch (e) {
    console.log("[sing] yt-dlp fail:", e.message.slice(0, 60));
    return null;
  }
}

/* ═══ iTunes preview — faster timeout ═══ */
async function getItunesPreview(title) {
  try {
    const r = await httpClient.get("https://itunes.apple.com/search", {
      params: { term: title, media: "music", limit: 1 },
      timeout: 8000
    });
    const preview = r.data?.results?.[0]?.previewUrl;
    if (preview) {
      console.log("[sing] ✅ iTunes preview");
      return preview;
    }
  } catch (_) {}
  return null;
}

/* ═══ Download file (uses keep-alive client) ═══ */
async function downloadFile(url, outPath) {
  const res = await httpClient.get(url, { responseType: "stream", timeout: 90000 });

  const contentLength = parseInt(res.headers["content-length"] || "0");
  if (contentLength > MAX_SIZE_BYTES) {
    try { res.data.destroy(); } catch (_) {}
    throw new Error(`Audio too big (${(contentLength / 1024 / 1024).toFixed(1)} MB > ${MAX_SIZE_MB} MB)`);
  }

  return new Promise((resolve, reject) => {
    const w = fs.createWriteStream(outPath);
    let downloaded = 0;
    let aborted = false;

    res.data.on("data", (chunk) => {
      downloaded += chunk.length;
      if (downloaded > MAX_SIZE_BYTES && !aborted) {
        aborted = true;
        try { res.data.destroy(); } catch (_) {}
        try { w.destroy(); } catch (_) {}
        try { fs.unlinkSync(outPath); } catch (_) {}
        reject(new Error(`Audio too big (>${MAX_SIZE_MB} MB)`));
      }
    });

    res.data.pipe(w);
    res.data.on("error", (e) => { if (!aborted) reject(e); });
    w.on("error", (e) => { if (!aborted) reject(e); });
    w.on("finish", () => {
      if (aborted) return;
      let sz = 0;
      try { sz = fs.statSync(outPath).size; } catch (_) {}
      if (sz < 5000) {
        try { fs.unlinkSync(outPath); } catch (_) {}
        return reject(new Error(`File too small (${sz} bytes)`));
      }
      resolve({ path: outPath, size: sz });
    });
  });
}

/* ═══ Clean old temp files ═══ */
function cleanOldFiles() {
  try {
    const now = Date.now();
    const ONE_HOUR = 3600 * 1000;
    for (const f of fs.readdirSync(TMP_DIR)) {
      if (!f.startsWith("sing_")) continue;
      const fp = path.join(TMP_DIR, f);
      try {
        const st = fs.statSync(fp);
        if (now - st.mtimeMs > ONE_HOUR) fs.unlinkSync(fp);
      } catch (_) {}
    }
  } catch (_) {}
}

/* ═══ Send audio file ═══ */
function sendAudio(api, threadID, filePath, title, artist, duration) {
  try {
    const stat = fs.statSync(filePath);
    const mb = stat.size / 1024 / 1024;

    if (mb > MAX_SIZE_MB) {
      try { fs.unlinkSync(filePath); } catch (_) {}
      api.sendMessage(
        `⚠️ Audio too big (${mb.toFixed(1)} MB > ${MAX_SIZE_MB} MB)\n❌ Skip korlam.`,
        threadID
      );
      return;
    }

    const message = {
      body: `🎵 ${title}\n👤 ${artist}\n⏱️ ${duration}\n📦 ${mb.toFixed(2)} MB`,
      attachment: fs.createReadStream(filePath)
    };

    api.sendMessage(message, threadID, (err, info) => {
      try { fs.unlinkSync(filePath); } catch (_) {}
      if (err) console.error("[sing] send err:", err.message);
      else console.log("[sing] ✅ audio sent:", info?.messageID);
    });
  } catch (e) {
    console.error("[sing] sendAudio err:", e.message);
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════ */
module.exports = {
  name: "sing",
  aliases: ["song", "music", "gaan", "gan"],
  version: "9.1.1-fast",
  role: 0,
  description: "Search and send full song",
  usage: "/sing <song name>",
  category: "fun",

  execute: async function (api, event, args, db, config) {
    const { threadID, senderID, messageID } = event;

    try {
      cleanOldFiles();

      const query = args.join(" ").trim();
      if (!query) return api.sendMessage(`🎵 Use: /sing <song name>`, threadID);

      /* Non-blocking react — no more 300ms wait */
      reactFast(api, "⏳", messageID, threadID);
      console.log(`[sing] searching: "${query}"`);

      /* ═══ STEP 1: Search (cached) ═══ */
      let results = getCachedSearch(query);

      if (!results) {
        let search;
        try {
          search = await yts(query);
        } catch (err) {
          console.error("[sing] yt-search error:", err.message);
          reactFast(api, "❌", messageID, threadID);
          return api.sendMessage(`❌ YouTube search failed: ${err.message}`, threadID);
        }

        results = (search?.videos || [])
          .filter((v) => v && v.title && v.videoId && v.seconds >= 30)
          .slice(0, 10);

        if (results.length) setCachedSearch(query, results);
      } else {
        console.log("[sing] cache hit");
      }

      if (!results.length) {
        reactFast(api, "❌", messageID, threadID);
        return api.sendMessage(`❌ "${query}" — no results found.`, threadID);
      }

      reactFast(api, "✅", messageID, threadID);

      /* ═══ STEP 2: Send list ═══ */
      const lines = [`🎵 SONG LIST`, `━━━━━━━━━━━━━━━━━━`];
      results.forEach((s, i) => {
        const name = String(s.title).slice(0, 42);
        const author = String(s.author?.name || "Unknown").slice(0, 22);
        const dur = s.timestamp || "0:00";
        lines.push(`${i + 1}. ${name}`);
        lines.push(`   👤 ${author}  ⏱️ ${dur}`);
      });
      lines.push(``, `📩 Reply with a number (1-${results.length})`);

      api.sendMessage(lines.join("\n"), threadID, (err, info) => {
        if (err) return console.error("[sing] list send err:", err.message);

        const realMID = info?.messageID ? String(info.messageID) : null;
        const fallbackKey = `fb_${threadID}_${senderID}`;
        const storeKey = realMID || fallbackKey;

        const storeData = {
          results,
          threadID: String(threadID),
          senderID: String(senderID),
          time: Date.now()
        };

        songSearches.set(storeKey, storeData);
        if (realMID) songSearches.set(fallbackKey, storeData);

        if (realMID) {
          setTimeout(() => {
            try { api.unsendMessage(realMID, () => {}); } catch (_) {}
          }, 30000);
        }

        setTimeout(() => {
          if (songSearches.has(storeKey)) songSearches.delete(storeKey);
          if (songSearches.has(fallbackKey)) songSearches.delete(fallbackKey);
        }, 5 * 60 * 1000);

        console.log(`[sing] stored: ${storeKey}`);
      });

    } catch (e) {
      console.error("[sing] error:", e.message);
      reactFast(api, "❌", messageID, threadID);
    }
  },

  /* ═══════════════════════════════════════════════════════════
     REPLY HANDLER — PARALLEL FETCH (was sequential)
     ═══════════════════════════════════════════════════════════ */
  handleReply: async function (api, event, messageID, threadID, senderID, body) {
    if (!body && messageID && typeof messageID === "object") {
      body = event.body;
      threadID = event.threadID;
      senderID = event.senderID;
      messageID = event.messageID;
    }

    if (!body) return false;

    const num = parseInt(String(body).trim(), 10);
    if (isNaN(num) || num < 1 || num > 10) return false;

    const replyToMID = event.messageReply?.messageID ? String(event.messageReply.messageID) : null;
    const fallbackKey = `fb_${threadID}_${senderID}`;

    const keys = [replyToMID, fallbackKey].filter(Boolean);
    let entry = null;
    for (const k of keys) {
      if (songSearches.has(k)) { entry = songSearches.get(k); break; }
    }

    if (!entry || !entry.results || !entry.results[num - 1]) return false;

    const song = entry.results[num - 1];
    reactFast(api, "⏳", messageID, threadID);

    /* Clean store immediately — prevent double reply */
    if (replyToMID) songSearches.delete(replyToMID);
    songSearches.delete(fallbackKey);

    try {
      console.log(`[sing] downloading: ${song.title}`);

      let finalPath = null;
      let isPreview = false;

      /* ═══════════════════════════════════════════════════════
         SPEED: fire ALL 3 methods in PARALLEL, first success wins
         (before: btch → wait → yt-dlp → wait → iTunes = ~40s)
         (after:  all start together = ~7-12s)
         ═══════════════════════════════════════════════════════ */
      const btchP   = getAudioUrlBtch(song.videoId).catch(() => null);
      const ytdlpP  = getAudioUrlYtdlp(song.videoId).catch(() => null);
      const itunesP = getItunesPreview(song.title).catch(() => null);

      /* Stage 1 — wait max 7s for btch (fastest when it works) */
      const btchUrl = await Promise.race([
        btchP,
        new Promise((r) => setTimeout(() => r("__TIMEOUT__"), 7000))
      ]);

      if (btchUrl && btchUrl !== "__TIMEOUT__") {
        try {
          const safe = String(song.title).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
          const outPath = path.join(TMP_DIR, `sing_btch_${song.videoId}_${safe}.mp3`);
          const r = await downloadFile(btchUrl, outPath);
          finalPath = r.path;
        } catch (e) {
          console.log("[sing] btch dl fail:", e.message);
        }
      }

      /* Stage 2 — if btch failed, race yt-dlp vs iTunes */
      if (!finalPath) {
        console.log("[sing] racing yt-dlp vs iTunes…");

        const winner = await Promise.race([
          ytdlpP.then((r) => (r && r.localPath ? { type: "file", p: r.localPath } : new Promise(() => {}))),
          itunesP.then(async (u) => {
            if (!u) return new Promise(() => {});
            /* Download preview immediately */
            const safe = String(song.title).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
            const outPath = path.join(TMP_DIR, `sing_itunes_${Date.now()}_${safe}.mp3`);
            const r = await downloadFile(u, outPath);
            return { type: "preview", p: r.path };
          }),
          new Promise((r) => setTimeout(() => r(null), 25000))
        ]);

        if (winner && winner.type === "file") {
          finalPath = winner.p;
          isPreview = false;
          console.log("[sing] yt-dlp won");
        } else if (winner && winner.type === "preview") {
          finalPath = winner.p;
          isPreview = true;
          console.log("[sing] iTunes preview won");
        }
      }

      /* Stage 3 — last ditch: wait for yt-dlp if nothing */
      if (!finalPath) {
        const r = await ytdlpP;
        if (r && r.localPath) {
          finalPath = r.localPath;
          isPreview = false;
        }
      }

      if (!finalPath) throw new Error("All methods failed");

      reactFast(api, "✅", messageID, threadID);

      if (isPreview) {
        const stat = fs.statSync(finalPath);
        const mb = stat.size / 1024 / 1024;
        api.sendMessage({
          body: `⚠️ Full song pawa jayni — iTunes preview (30s)\n🎵 ${song.title.slice(0, 60)}\n📦 ${mb.toFixed(2)} MB`,
          attachment: fs.createReadStream(finalPath)
        }, threadID, () => {
          try { fs.unlinkSync(finalPath); } catch (_) {}
        });
      } else {
        sendAudio(
          api,
          threadID,
          finalPath,
          song.title,
          song.author?.name || "Unknown",
          song.timestamp || "0:00"
        );
      }

    } catch (err) {
      console.error("[sing] download error:", err.message);
      reactFast(api, "❌", messageID, threadID);

      const errMsg = err.message.includes("too big")
        ? `⚠️ ${err.message}`
        : `❌ Download failed: ${err.message.slice(0, 100)}`;

      api.sendMessage(errMsg, threadID);
    }

    return true;
  }
};

// © 2026 NEXUS BOT V1