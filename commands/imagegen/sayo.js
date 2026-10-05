/**
 * commands/imagegen/sayo.js
 * NEXUS BOT V1 — Universal image search (Jikan + Bing + DDG)
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══════════════════════════════════════════════════════
   STOP WORDS — remove filler from query
   ═══════════════════════════════════════════════════════ */
const STOP_WORDS = new Set([
  "sayo", "gen", "generate", "sent", "send", "some", "a", "an", "the", "me",
  "for", "give", "pic", "pics", "picture", "pictures", "image", "images",
  "photo", "photos", "please", "plz", "pls", "want", "need", "show", "find",
  "get", "download", "of", "to", "from", "with", "in", "on", "at", "by",
  "or", "and", "kore", "dao", "de", "ektu", "amar", "amake", "bhai", "vai",
  "anime", "aura", "hd", "4k", "wallpaper", "aesthetic", "the"
]);

function extractKeyword(text) {
  const words = String(text).toLowerCase().split(/\s+/).filter((w) => w && !STOP_WORDS.has(w));
  return words.join(" ").trim();
}

/* ═══════════════════════════════════════════════════════
   JIKAN API — MyAnimeList official (best for anime)
   ═══════════════════════════════════════════════════════ */
async function jikanCharacter(name) {
  try {
    const r = await axios.get("https://api.jikan.moe/v4/characters", {
      params: { q: name, limit: 8 },
      timeout: 15000,
      headers: { "User-Agent": "NEXUS-BOT/1.0" }
    });

    const chars = r.data && r.data.data ? r.data.data : [];
    const urls = [];

    for (const c of chars) {
      const img = c.images && c.images.jpg && c.images.jpg.image_url;
      if (!img || img.includes("questionmark")) continue;

      /* Verify name matches query */
      const charName = (c.name || "").toLowerCase();
      const query = name.toLowerCase();
      const nameWords = query.split(/\s+/);
      const matches = nameWords.some((w) => w.length > 2 && charName.includes(w));

      if (matches) {
        urls.push(img);
        console.log(`[sayo] jikan ✅ ${c.name} → ${img.slice(0, 60)}`);
      }
    }

    return urls;
  } catch (e) {
    console.log("[sayo] jikan fail: " + e.message.slice(0, 60));
    return [];
  }
}

/* ═══════════════════════════════════════════════════════
   ANILIST API — Alternative anime character database
   ═══════════════════════════════════════════════════════ */
async function anilistCharacter(name) {
  try {
    const query = `
      query ($search: String) {
        Page(perPage: 5) {
          characters(search: $search) {
            name { full }
            image { large medium }
          }
        }
      }
    `;

    const r = await axios.post("https://graphql.anilist.co", {
      query: query,
      variables: { search: name }
    }, {
      timeout: 15000,
      headers: { "Content-Type": "application/json", "Accept": "application/json" }
    });

    const chars = r.data && r.data.data && r.data.data.Page && r.data.data.Page.characters
      ? r.data.data.Page.characters : [];

    const urls = [];
    for (const c of chars) {
      const img = c.image && (c.image.large || c.image.medium);
      if (img) {
        urls.push(img);
        console.log(`[sayo] anilist ✅ ${c.name && c.name.full}`);
      }
    }

    return urls;
  } catch (e) {
    console.log("[sayo] anilist fail: " + e.message.slice(0, 60));
    return [];
  }
}

/* ═══════════════════════════════════════════════════════
   SAFE BOORU APIs — for anime wallpapers
   ═══════════════════════════════════════════════════════ */
async function nekosBest() {
  try {
    const r = await axios.get("https://nekos.best/api/v2/neko?amount=5", { timeout: 10000 });
    const results = r.data && r.data.results ? r.data.results : [];
    return results.map((x) => x.url).filter(Boolean);
  } catch (_) { return []; }
}

async function waifuPics() {
  try {
    const r = await axios.get("https://api.waifu.pics/sfw/waifu", { timeout: 10000 });
    return r.data && r.data.url ? [r.data.url] : [];
  } catch (_) { return []; }
}

/* ═══════════════════════════════════════════════════════
   BING IMAGE SEARCH
   ═══════════════════════════════════════════════════════ */
async function bingSearch(query) {
  try {
    const url = "https://www.bing.com/images/search?q=" + encodeURIComponent(query) + "&qft=+filterui:imagesize-large&first=1";
    const r = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,*/*",
        "Accept-Language": "en-US,en;q=0.9"
      },
      timeout: 15000
    });

    const html = typeof r.data === "string" ? r.data : "";
    const urls = [];
    let m;

    const re1 = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/g;
    while ((m = re1.exec(html)) !== null && urls.length < 40) {
      const u = m[1].replace(/\\u002f/gi, "/").replace(/\\/g, "");
      if (/\.(jpg|jpeg|png|webp)/i.test(u)) urls.push(u);
    }

    if (!urls.length) {
      const re2 = /"murl":"(https?:\/\/[^"]+)"/g;
      while ((m = re2.exec(html)) !== null && urls.length < 40) {
        const u = m[1].replace(/\\u002f/gi, "/").replace(/\\/g, "");
        if (/\.(jpg|jpeg|png|webp)/i.test(u)) urls.push(u);
      }
    }

    return urls;
  } catch (e) {
    console.log("[sayo] bing fail: " + e.message.slice(0, 50));
    return [];
  }
}

/* ═══════════════════════════════════════════════════════
   DUCKDUCKGO IMAGE SEARCH
   ═══════════════════════════════════════════════════════ */
async function ddgSearch(query) {
  try {
    const init = await axios.get(
      "https://duckduckgo.com/?q=" + encodeURIComponent(query) + "&iax=images&ia=images",
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        timeout: 15000
      }
    );

    const vqd = String(init.data).match(/vqd=["']?([\d-]+)["']?/);
    if (!vqd) return [];

    const r = await axios.get("https://duckduckgo.com/i.js", {
      params: { l: "us-en", o: "json", q: query, vqd: vqd[1], f: ",,,", p: "1" },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://duckduckgo.com/"
      },
      timeout: 15000
    });

    const results = r.data && r.data.results ? r.data.results : [];
    return results.slice(0, 40).map((x) => x.image).filter(Boolean);
  } catch (e) {
    console.log("[sayo] ddg fail: " + e.message.slice(0, 50));
    return [];
  }
}

/* ═══════════════════════════════════════════════════════
   DOWNLOAD with validation
   ═══════════════════════════════════════════════════════ */
async function downloadImage(url) {
  try {
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      maxContentLength: 25 * 1024 * 1024,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.bing.com/",
        "Accept": "image/*,*/*"
      }
    });

    const buf = Buffer.from(r.data);
    if (buf.length < 8000) return null;
    if (buf.length > 25 * 1024 * 1024) return null;

    const isJPG = buf[0] === 0xFF && buf[1] === 0xD8;
    const isPNG = buf[0] === 0x89 && buf[1] === 0x50;
    const isWEBP = buf.slice(0, 4).toString() === "RIFF";
    const isGIF = buf.slice(0, 3).toString() === "GIF";

    if (!isJPG && !isPNG && !isWEBP && !isGIF) return null;

    let ext = "jpg";
    if (isPNG) ext = "png";
    else if (isWEBP) ext = "webp";
    else if (isGIF) ext = "gif";

    return { buf, ext };
  } catch (_) {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════
   MASTER SEARCH
   ═══════════════════════════════════════════════════════ */
async function masterSearch(query) {
  let urls = [];

  /* STEP 1 — Jikan API (best for anime) */
  console.log("[sayo] trying Jikan...");
  const jikanUrls = await jikanCharacter(query);
  if (jikanUrls.length >= 3) {
    console.log("[sayo] ✅ Jikan gave " + jikanUrls.length + " results");
    return jikanUrls;
  }
  urls = urls.concat(jikanUrls);

  /* STEP 2 — AniList API */
  console.log("[sayo] trying AniList...");
  const anilistUrls = await anilistCharacter(query);
  if (anilistUrls.length >= 3) {
    console.log("[sayo] ✅ AniList gave " + anilistUrls.length + " results");
    return urls.concat(anilistUrls);
  }
  urls = urls.concat(anilistUrls);

  /* STEP 3 — Bing */
  console.log("[sayo] trying Bing...");
  const bingUrls = await bingSearch(query + " anime character HD");
  urls = urls.concat(bingUrls);

  /* STEP 4 — DDG */
  if (urls.length < 5) {
    console.log("[sayo] trying DDG...");
    const ddgUrls = await ddgSearch(query + " anime character");
    urls = urls.concat(ddgUrls);
  }

  /* STEP 5 — Random anime APIs (fallback) */
  if (urls.length < 5) {
    console.log("[sayo] trying nekos.best + waifu.pics...");
    const nk = await nekosBest();
    const wp = await waifuPics();
    urls = urls.concat(nk, wp);
  }

  return urls;
}

/* ═══════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════ */
module.exports = {
  name: "sayo",
  aliases: [],
  version: "4.0.0",
  role: 0,
  description: "Universal HD image search (Jikan + AniList)",
  usage: "/sayo <keyword>",
  category: "imagegen",

  execute: async function (api, event, args, db, config) {
    const threadID = event.threadID;
    const messageID = event.messageID;
    const body = event.body || "";

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    let raw = String(body).trim();
    const prefix = config.prefix || "/";
    if (raw.indexOf(prefix) === 0) raw = raw.slice(prefix.length).trim();
    raw = raw.replace(/^sayo\s+/i, "").trim();

    const query = extractKeyword(raw) || args.join(" ").trim();

    if (!query) {
      react("❓");
      return api.sendMessage("Usage: /sayo <keyword>\nExample: /sayo naruto", threadID);
    }

    react("⏳");
    console.log("[sayo] query: " + query);

    let tmp = null;

    try {
      /* Search */
      const urls = await masterSearch(query);

      if (!urls.length) throw new Error("no images found");

      console.log("[sayo] total: " + urls.length + " urls");

      /* Dedupe + shuffle */
      const unique = [...new Set(urls)].sort(() => Math.random() - 0.5);

      /* Download */
      let buf = null;
      let ext = "jpg";

      for (const url of unique.slice(0, 15)) {
        const r = await downloadImage(url);
        if (!r) continue;
        if (r.buf.length < 20000) continue;
        buf = r.buf;
        ext = r.ext;
        console.log("[sayo] ✅ got " + (buf.length / 1024).toFixed(0) + " KB");
        break;
      }

      if (!buf) throw new Error("download failed");

      /* Save + send */
      tmp = path.join(os.tmpdir(), "sayo_" + Date.now() + "." + ext);
      await fs.writeFile(tmp, buf);

      react("✅");
      api.sendMessage({
        body: "🔍 " + query,
        attachment: fs.createReadStream(tmp)
      }, threadID, () => {
        try { fs.unlinkSync(tmp); } catch (_) {}
      });

    } catch (e) {
      console.error("[sayo] error:", e.message);
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage("❌ " + e.message.slice(0, 80), threadID);
    }
  }
};
