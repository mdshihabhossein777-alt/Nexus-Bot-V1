// commands/fun/sing.js - NEXUS V1 - Song search + download + send
const yts = require("yt-search");
const btch = require("btch-downloader");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const songSearches = require("../../utils/songStore");

const TMP_DIR = os.tmpdir();

function react(api, emoji, messageID, threadID) {
  return new Promise((resolve) => {
    if (!messageID || !threadID) return resolve(false);
    try {
      api.setMessageReaction(emoji, messageID, threadID, (err) => resolve(!err));
    } catch (_) { resolve(false); }
  });
}

/* 🔍 Find audio URL from any response shape */
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

/* 🎧 Get audio download URL using btch-downloader */
async function getAudioUrl(videoId) {
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const errors = [];

  // Method 1: btch-downloader
  try {
    const fn = btch.youtube || btch.ytmp3 || btch.yt || btch.y2mate;
    if (typeof fn === "function") {
      const data = await fn(ytUrl);
      const audioUrl = findAudioUrl(data);
      if (audioUrl) {
        console.log("[sing] ✅ btch-downloader success");
        return audioUrl;
      }
      errors.push("btch: no url");
    } else {
      errors.push("btch: fn missing");
    }
  } catch (e) {
    errors.push("btch: " + e.message);
  }

  // Method 2: fallback — try all btch fns
  try {
    for (const fnName of Object.keys(btch)) {
      if (typeof btch[fnName] !== "function") continue;
      if (["youtube", "ytmp3", "yt", "y2mate"].includes(fnName)) continue;
      try {
        const data = await btch[fnName](ytUrl);
        const audioUrl = findAudioUrl(data);
        if (audioUrl) {
          console.log(`[sing] ✅ btch.${fnName} success`);
          return audioUrl;
        }
      } catch (_) {}
    }
  } catch (_) {}

  throw new Error("No audio URL — " + errors.join(" | "));
}

/* 💾 Download file to temp dir */
async function downloadFile(url, outPath) {
  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 90000,
    maxContentLength: 100 * 1024 * 1024,
    maxBodyLength: 100 * 1024 * 1024,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "*/*",
    },
  });

  return new Promise((resolve, reject) => {
    const w = fs.createWriteStream(outPath);
    res.data.pipe(w);
    res.data.on("error", reject);
    w.on("error", reject);
    w.on("finish", () => {
      const sz = fs.statSync(outPath).size;
      if (sz < 5000) {
        try { fs.unlinkSync(outPath); } catch (_) {}
        return reject(new Error(`File too small (${sz} bytes) — likely a bad URL`));
      }
      resolve(outPath);
    });
  });
}

/* 🧹 Clean old temp files */
function cleanOldFiles() {
  try {
    const now = Date.now();
    const ONE_HOUR = 3600 * 1000;
    for (const f of fs.readdirSync(TMP_DIR)) {
      if (f.startsWith("sing_")) {
        const fp = path.join(TMP_DIR, f);
        try {
          const st = fs.statSync(fp);
          if (now - st.mtimeMs > ONE_HOUR) fs.unlinkSync(fp);
        } catch (_) {}
      }
    }
  } catch (_) {}
}

/* 📤 Send audio file to Messenger */
function sendAudio(api, threadID, filePath, title, artist, duration) {
  try {
    const stat = fs.statSync(filePath);
    const isBig = stat.size > 25 * 1024 * 1024;

    const message = {
      body: `🎵 ${title}\n👤 ${artist}\n⏱️ ${duration}\n📦 ${(stat.size / 1024 / 1024).toFixed(2)} MB`,
      attachment: fs.createReadStream(filePath),
    };

    if (isBig) {
      console.log(`[sing] File ${(stat.size/1024/1024).toFixed(2)}MB > 25MB — may fail on Messenger`);
    }

    api.sendMessage(message, threadID, (err, info) => {
      setTimeout(() => { try { fs.unlinkSync(filePath); } catch (_) {} }, 8000);
      if (err) console.error("[sing] send audio err:", err.message);
      else console.log("[sing] ✅ audio sent:", info?.messageID);
    });
  } catch (e) {
    console.error("[sing] sendAudio err:", e.message);
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
}

module.exports = {
  name: "sing",
  aliases: ["song", "music", "gaan", "gan"],
  version: "9.0.0",
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

      if (messageID) await react(api, "⏳", messageID, threadID);
      console.log(`[sing] searching: "${query}"`);

      // STEP 1: Search
      let search;
      try {
        search = await yts(query);
      } catch (err) {
        console.error("[sing] yt-search error:", err.message);
        if (messageID) await react(api, "❌", messageID, threadID);
        return api.sendMessage(`❌ YouTube search failed: ${err.message}`, threadID);
      }

      const results = (search?.videos || [])
        .filter((v) => v && v.title && v.videoId && v.seconds >= 30)
        .slice(0, 10);

      if (!results.length) {
        if (messageID) await react(api, "❌", messageID, threadID);
        return api.sendMessage(`❌ "${query}" — no results found.`, threadID);
      }

      if (messageID) await react(api, "✅", messageID, threadID);

      // STEP 2: Send list
      const lines = [`🎵 SONG LIST`, `━━━━━━━━━━━━━━━━━━`];
      results.forEach((s, i) => {
        const name = String(s.title).slice(0, 42);
        const author = String(s.author?.name || "Unknown").slice(0, 22);
        const dur = s.timestamp || "0:00";
        lines.push(`${i + 1}. ${name}`);
        lines.push(`   👤 ${author}  ⏱️ ${dur}`);
      });
      lines.push(``, `📩 Reply with a number (1-${results.length}) to get the song.`);

      api.sendMessage(lines.join("\n"), threadID, (err, info) => {
        if (err) return console.error("[sing] list send err:", err.message);

        const realMID = info?.messageID ? String(info.messageID) : null;
        const fallbackKey = `fb_${threadID}_${senderID}`;
        const storeKey = realMID || fallbackKey;

        const storeData = {
          results,
          threadID: String(threadID),
          senderID: String(senderID),
          time: Date.now(),
        };

        songSearches.set(storeKey, storeData);
        if (realMID) songSearches.set(fallbackKey, storeData);

        // Auto-unsend list after 30s (keep store)
        if (realMID) {
          setTimeout(() => {
            try { api.unsendMessage(realMID, () => {}); } catch (_) {}
          }, 30000);
        }

        // Cleanup store after 5 min
        setTimeout(() => {
          if (songSearches.has(storeKey)) songSearches.delete(storeKey);
          if (songSearches.has(fallbackKey)) songSearches.delete(fallbackKey);
        }, 5 * 60 * 1000);

        console.log(`[sing] stored: ${storeKey}`);
      });

    } catch (e) {
      console.error("[sing] error:", e.message);
      if (messageID) await react(api, "❌", messageID, threadID);
    }
  },

  /* 🎯 Reply handler — when user replies with a number */
  handleReply: async function (api, event, songSearches, config) {
    const { threadID, senderID, messageID, body, messageReply } = event;
    if (!body) return false;

    const num = parseInt(body.trim(), 10);
    if (isNaN(num) || num < 1 || num > 10) return false;

    // Look up using replied message ID + fallback
    const keys = [
      messageReply?.messageID ? String(messageReply.messageID) : null,
      `fb_${threadID}_${senderID}`,
    ].filter(Boolean);

    let entry = null;
    for (const k of keys) {
      if (songSearches.has(k)) { entry = songSearches.get(k); break; }
    }

    if (!entry || !entry.results || !entry.results[num - 1]) return false;

    const song = entry.results[num - 1];
    if (messageID) await react(api, "⏳", messageID, threadID);

    try {
      console.log(`[sing] downloading: ${song.title}`);

      const audioUrl = await getAudioUrl(song.videoId);
      console.log(`[sing] audio url: ${audioUrl.slice(0, 80)}...`);

      const safe = String(song.title).replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
      const outPath = path.join(TMP_DIR, `sing_${song.videoId}_${safe}.mp3`);

      await downloadFile(audioUrl, outPath);

      if (messageID) await react(api, "✅", messageID, threadID);

      sendAudio(
        api,
        threadID,
        outPath,
        song.title,
        song.author?.name || "Unknown",
        song.timestamp || "0:00"
      );
    } catch (err) {
      console.error("[sing] download error:", err.message);
      if (messageID) await react(api, "❌", messageID, threadID);
      api.sendMessage(`❌ Download failed: ${err.message}`, threadID);
    }

    return true;
  },
};