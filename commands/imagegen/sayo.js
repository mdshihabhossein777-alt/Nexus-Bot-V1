/**
 * commands/imagegen/sayo.js
 * NEXUS BOT V1 — HD image search (anime-aware)
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══ Known anime characters ═══ */
const ANIME_KEYWORDS = [
  "luffy", "zoro", "nami", "sanji", "chopper", "robin", "franky", "brook", "jinbe",
  "naruto", "sasuke", "sakura", "kakashi", "itachi", "hinata", "boruto", "madara",
  "goku", "vegeta", "gohan", "piccolo", "frieza", "bulma", "krillin", "trunks",
  "gojo", "yuji", "megumi", "nobara", "sukuna", "toji", "geto",
  "tanjiro", "nezuko", "zenitsu", "inosuke", "rengoku", "giyu", "shinobu",
  "eren", "mikasa", "armin", "levi", "erwin", "hange",
  "deku", "bakugo", "todoroki", "uraraka", "all might", "midoriya",
  "ichigo", "rukia", "aizen", "uryu", "orihime",
  "asta", "yuno", "noelle", "yami",
  "saitama", "genos", "tatsumaki",
  "light", "l", "ryuk", "near", "mello",
  "hinata", "kageyama", "tsukishima", "oikawa",
  "kirito", "asuna", "sao",
  "sasuke", "itachi", "pain", "obito", "madara", "hashirama",
  "mikasa", "levi", "eren",
  "shoto", "bakugo",
  "gaara", "rock lee", "neji", "shikamaru",
  "roronoa", "monkey d", "portgas", "ace", "sabo"
];

function isAnimeQuery(text) {
  const low = text.toLowerCase();
  return ANIME_KEYWORDS.some((k) => low.includes(k));
}

/* ═══ Extract keyword from natural language ═══ */
function extractKeyword(text) {
  const stop = new Set([
    "sayo", "sent", "send", "some", "a", "an", "the", "me", "for", "give",
    "pic", "pics", "picture", "pictures", "image", "images", "photo", "photos",
    "please", "plz", "pls", "want", "need", "show", "find", "get", "download",
    "of", "to", "from", "with", "in", "on", "at", "by", "or", "and", "kore",
    "dao", "de", "ektu", "amar", "amake", "bhai", "vai"
  ]);
  const words = text.toLowerCase().split(/\s+/).filter((w) => w && !stop.has(w));
  return words.join(" ").trim();
}

/* ═══ Bing Image Search ═══ */
async function bingSearch(query) {
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1&qft=+filterui:imagesize-large`;
    const r = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      },
      timeout: 15000
    });

    const html = typeof r.data === "string" ? r.data : "";
    const urls = [];

    /* Pattern 1 */
    let m;
    const re1 = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/g;
    while ((m = re1.exec(html)) !== null && urls.length < 40) {
      const u = m[1].replace(/\\u002f/gi, "/").replace(/\\/g, "");
      if (/\.(jpg|jpeg|png|webp)/i.test(u)) urls.push(u);
    }

    /* Pattern 2 */
    if (!urls.length) {
      const re2 = /"murl":"(https?:\/\/[^"]+)"/g;
      while ((m = re2.exec(html)) !== null && urls.length < 40) {
        const u = m[1].replace(/\\u002f/gi, "/").replace(/\\/g, "");
        if (/\.(jpg|jpeg|png|webp)/i.test(u)) urls.push(u);
      }
    }

    return urls;
  } catch (e) {
    console.log("[sayo] bing fail: " + e.message);
    return [];
  }
}

/* ═══ DuckDuckGo Image Search (backup) ═══ */
async function ddgSearch(query) {
  try {
    /* DDG requires vqd token */
    const initRes = await axios.get(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      timeout: 15000
    });
    const vqdMatch = String(initRes.data).match(/vqd=["']?([\d-]+)["']?/);
    if (!vqdMatch) return [];

    const r = await axios.get("https://duckduckgo.com/i.js", {
      params: {
        l: "us-en",
        o: "json",
        q: query,
        vqd: vqdMatch[1],
        f: ",,,",
        p: "1"
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://duckduckgo.com/"
      },
      timeout: 15000
    });

    const results = r.data?.results || [];
    return results.slice(0, 40).map((x) => x.image).filter(Boolean);
  } catch (e) {
    console.log("[sayo] ddg fail: " + e.message);
    return [];
  }
}

/* ═══ Download image with validation ═══ */
async function downloadImage(url) {
  try {
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      maxContentLength: 20 * 1024 * 1024,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.bing.com/",
        "Accept": "image/*,*/*"
      }
    });

    const buf = Buffer.from(r.data);
    if (buf.length < 15000) return null;      /* min 15KB */
    if (buf.length > 20 * 1024 * 1024) return null;

    /* Magic bytes check */
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

/* ═══ Main Command ═══ */
module.exports = {
  name: "sayo",
  aliases: ["pic", "img", "image", "photo", "hdimg"],
  version: "2.0.0",
  role: 0,
  description: "Search and send HD image from web",
  usage: "~sayo <keyword>",
  category: "imagegen",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, body } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    let raw = (body || "").trim();
    const prefix = config.prefix || "/";
    if (raw.startsWith(prefix)) raw = raw.slice(prefix.length).trim();

    raw = raw
      .replace(/^(sayo|pic|img|image|photo|hdimg)\s+/i, "")
      .trim();

    const query = extractKeyword(raw) || args.join(" ").trim();

    if (!query) {
      react("❓");
      return api.sendMessage("Usage: ~sayo <keyword>\nExample: ~sayo luffy", threadID);
    }

    react("⏳");
    console.log(`[sayo] query: "${query}"`);

    let tmp = null;

    try {
      /* ═══ Anime-aware search queries ═══ */
      const isAnime = isAnimeQuery(query);
      let searchQueries = [];

      if (isAnime) {
        searchQueries = [
          `${query} anime 4k wallpaper`,
          `${query} anime HD`,
          `${query} anime character hd`,
          query
        ];
      } else {
        searchQueries = [
          `${query} HD wallpaper 4k`,
          `${query} HD`,
          query
        ];
      }

      console.log(`[sayo] anime: ${isAnime}`);

      /* ═══ Try each query with Bing then DDG ═══ */
      let urls = [];
      for (const q of searchQueries) {
        const bing = await bingSearch(q);
        if (bing.length >= 5) { urls = bing; break; }
        urls = urls.concat(bing);
      }

      /* Fallback to DDG */
      if (urls.length < 5) {
        console.log("[sayo] trying DuckDuckGo...");
        for (const q of searchQueries) {
          const ddg = await ddgSearch(q);
          if (ddg.length >= 5) { urls = urls.concat(ddg); break; }
        }
      }

      if (!urls.length) throw new Error("no images found");

      /* ═══ Filter out wrong results (keywords in URL) ═══ */
      const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

      let buf = null;
      let ext = "jpg";
      const shuffled = [...new Set(urls)].sort(() => Math.random() - 0.5);

      for (const url of shuffled.slice(0, 15)) {
        const result = await downloadImage(url);
        if (!result) continue;

        buf = result.buf;
        ext = result.ext;
        console.log(`[sayo] got: ${url.slice(0, 80)} (${(buf.length / 1024).toFixed(0)} KB)`);
        break;
      }

      if (!buf) throw new Error("all downloads failed");

      /* ═══ Save + send ═══ */
      tmp = path.join(os.tmpdir(), `sayo_${Date.now()}.${ext}`);
      await fs.writeFile(tmp, buf);

      react("✅");
      api.sendMessage({
        body: `🔍 ${query}`,
        attachment: fs.createReadStream(tmp)
      }, threadID, () => {
        try { fs.unlinkSync(tmp); } catch (_) {}
      });

    } catch (e) {
      console.error("[sayo] error:", e.message);
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1