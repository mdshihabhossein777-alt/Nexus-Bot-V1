/**
 * commands/imagegen/sayo.js
 * NEXUS BOT V1 — HD image search (multi-API, anime-aware)
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══════════════════════════════════════════════════════════════════
   ANIME KEYWORDS
   ═══════════════════════════════════════════════════════════════════ */
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
  "light", "ryuk", "near", "mello",
  "kageyama", "tsukishima", "oikawa",
  "kirito", "asuna", "sao",
  "pain", "obito", "hashirama",
  "shoto", "gaara", "rock lee", "neji", "shikamaru",
  "roronoa", "monkey d", "portgas", "ace", "sabo",
  "anime", "waifu", "husbando", "manga", "otaku", "chibi", "kawaii"
];

function isAnimeQuery(text) {
  const low = String(text).toLowerCase();
  return ANIME_KEYWORDS.some((k) => low.includes(k));
}

/* ═══════════════════════════════════════════════════════════════════
   KEYWORD EXTRACTION
   ═══════════════════════════════════════════════════════════════════ */
function extractKeyword(text) {
  const stop = new Set([
    "sayo", "sent", "send", "some", "a", "an", "the", "me", "for", "give",
    "pic", "pics", "picture", "pictures", "image", "images", "photo", "photos",
    "please", "plz", "pls", "want", "need", "show", "find", "get", "download",
    "of", "to", "from", "with", "in", "on", "at", "by", "or", "and", "kore",
    "dao", "de", "ektu", "amar", "amake", "bhai", "vai"
  ]);
  const words = String(text).toLowerCase().split(/\s+/).filter((w) => w && !stop.has(w));
  return words.join(" ").trim();
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 1: nekos.best  (anime SFW)
   ═══════════════════════════════════════════════════════════════════ */
async function nekosBest(query) {
  try {
    /* Map query to category if possible */
    const q = query.toLowerCase();
    const categories = ["neko", "kitsune", "husbando", "waifu"];
    const hit = categories.find((c) => q.includes(c));

    const url = hit
      ? `https://nekos.best/api/v2/${hit}?amount=5`
      : `https://nekos.best/api/v2/neko?amount=5`;

    const r = await axios.get(url, { timeout: 10000 });
    const results = r.data?.results || [];
    return results.map((x) => x.url).filter(Boolean);
  } catch (e) {
    console.log("[sayo] nekos.best fail:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 2: waifu.pics  (anime SFW)
   ═══════════════════════════════════════════════════════════════════ */
async function waifuPics(query) {
  try {
    const q = query.toLowerCase();
    const cats = ["waifu", "neko", "shinobu", "megumin", "bully", "cuddle", "hug", "kiss", "pat", "smile", "wave"];
    const hit = cats.find((c) => q.includes(c)) || "waifu";

    const r = await axios.get(`https://api.waifu.pics/sfw/${hit}`, { timeout: 10000 });
    const u = r.data?.url;
    return u ? [u] : [];
  } catch (e) {
    console.log("[sayo] waifu.pics fail:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 3: Konachan  (anime wallpaper — high quality)
   ═══════════════════════════════════════════════════════════════════ */
async function konachanSearch(query) {
  try {
    const tags = query.toLowerCase().trim().replace(/\s+/g, "_");
    const url = `https://konachan.com/post.json?tags=${encodeURIComponent(tags + " rating:safe")}&limit=10`;

    const r = await axios.get(url, {
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0 NEXUS-BOT/1.0" }
    });

    const posts = Array.isArray(r.data) ? r.data : [];
    return posts.map((p) => p.file_url || p.preview_url).filter(Boolean);
  } catch (e) {
    console.log("[sayo] konachan fail:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 4: yande.re  (anime wallpaper)
   ═══════════════════════════════════════════════════════════════════ */
async function yandereSearch(query) {
  try {
    const tags = query.toLowerCase().trim().replace(/\s+/g, "_");
    const url = `https://yande.re/post.json?tags=${encodeURIComponent(tags + " rating:safe")}&limit=10`;

    const r = await axios.get(url, {
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0 NEXUS-BOT/1.0" }
    });

    const posts = Array.isArray(r.data) ? r.data : [];
    return posts.map((p) => p.file_url || p.preview_url).filter(Boolean);
  } catch (e) {
    console.log("[sayo] yandere fail:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 5: Safebooru  (anime)
   ═══════════════════════════════════════════════════════════════════ */
async function safebooruSearch(query) {
  try {
    const tags = query.toLowerCase().trim().replace(/\s+/g, "_");
    const url = `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=10&tags=${encodeURIComponent(tags)}`;

    const r = await axios.get(url, {
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0 NEXUS-BOT/1.0" }
    });

    const posts = Array.isArray(r.data) ? r.data : [];
    return posts.map((p) =>
      p.image ? `https://safebooru.org/images/${p.directory}/${p.image}` : null
    ).filter(Boolean);
  } catch (e) {
    console.log("[sayo] safebooru fail:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 6: Bing Image Search
   ═══════════════════════════════════════════════════════════════════ */
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
    let m;

    /* Pattern 1: murl in HTML-encoded JSON */
    const re1 = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/g;
    while ((m = re1.exec(html)) !== null && urls.length < 40) {
      const u = m[1].replace(/\\u002f/gi, "/").replace(/\\/g, "");
      if (/\.(jpg|jpeg|png|webp)/i.test(u)) urls.push(u);
    }

    /* Pattern 2: plain murl */
    if (!urls.length) {
      const re2 = /"murl":"(https?:\/\/[^"]+)"/g;
      while ((m = re2.exec(html)) !== null && urls.length < 40) {
        const u = m[1].replace(/\\u002f/gi, "/").replace(/\\/g, "");
        if (/\.(jpg|jpeg|png|webp)/i.test(u)) urls.push(u);
      }
    }

    /* Pattern 3: any direct image URL */
    if (!urls.length) {
      const re3 = /(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp))/gi;
      while ((m = re3.exec(html)) !== null && urls.length < 40) {
        urls.push(m[1]);
      }
    }

    return urls;
  } catch (e) {
    console.log("[sayo] bing fail:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 7: DuckDuckGo Image Search
   ═══════════════════════════════════════════════════════════════════ */
async function ddgSearch(query) {
  try {
    const initRes = await axios.get(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        timeout: 15000
      }
    );
    const vqdMatch = String(initRes.data).match(/vqd=["']?([\d-]+)["']?/);
    if (!vqdMatch) return [];

    const r = await axios.get("https://duckduckgo.com/i.js", {
      params: { l: "us-en", o: "json", q: query, vqd: vqdMatch[1], f: ",,,", p: "1" },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://duckduckgo.com/"
      },
      timeout: 15000
    });

    const results = r.data?.results || [];
    return results.slice(0, 40).map((x) => x.image).filter(Boolean);
  } catch (e) {
    console.log("[sayo] ddg fail:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 8: Wikimedia Commons
   ═══════════════════════════════════════════════════════════════════ */
async function wikimediaSearch(query) {
  try {
    const url = `https://commons.wikimedia.org/w/api.php`;
    const r = await axios.get(url, {
      params: {
        action: "query",
        format: "json",
        generator: "search",
        gsrsearch: query,
        gsrnamespace: 6,
        gsrlimit: 15,
        prop: "imageinfo",
        iiprop: "url|size",
        iiurlwidth: 1920
      },
      headers: { "User-Agent": "NEXUS-BOT/1.0 (contact@example.com)" },
      timeout: 12000
    });

    const pages = r.data?.query?.pages || {};
    const urls = [];
    for (const id of Object.keys(pages)) {
      const p = pages[id];
      const info = p.imageinfo?.[0];
      if (!info) continue;
      const u = info.thumburl || info.url;
      if (u && /\.(jpg|jpeg|png|webp)$/i.test(u)) urls.push(u);
    }
    return urls;
  } catch (e) {
    console.log("[sayo] wikimedia fail:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 9: SearXNG public instances
   ═══════════════════════════════════════════════════════════════════ */
const SEARX_INSTANCES = [
  "https://searx.be",
  "https://search.bus-hit.me",
  "https://searx.tiekoetter.com",
  "https://opnxng.com",
  "https://baresearch.org"
];

async function searxSearch(query) {
  for (const base of SEARX_INSTANCES) {
    try {
      const r = await axios.get(`${base}/search`, {
        params: { q: query, categories: "images", format: "json", safesearch: 1 },
        headers: { "User-Agent": "Mozilla/5.0 NEXUS-BOT/1.0" },
        timeout: 10000
      });

      const results = r.data?.results || [];
      const urls = results.map((x) => x.img_src || x.url).filter(Boolean);
      if (urls.length) {
        console.log(`[sayo] searx hit: ${base}`);
        return urls;
      }
    } catch (_) {}
  }
  return [];
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 10: Reddit (via public JSON)
   ═══════════════════════════════════════════════════════════════════ */
async function redditSearch(query) {
  try {
    const r = await axios.get(`https://www.reddit.com/search.json`, {
      params: { q: query, limit: 30, sort: "relevance", type: "link" },
      headers: { "User-Agent": "Mozilla/5.0 NEXUS-BOT/1.0" },
      timeout: 12000
    });

    const posts = r.data?.data?.children || [];
    const urls = [];
    for (const p of posts) {
      const url = p.data?.url_overridden_by_dest || p.data?.url || "";
      if (/\.(jpg|jpeg|png|webp)$/i.test(url)) urls.push(url);
    }
    return urls;
  } catch (e) {
    console.log("[sayo] reddit fail:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   IMAGE DOWNLOADER with validation
   ═══════════════════════════════════════════════════════════════════ */
async function downloadImage(url, referer = "https://www.bing.com/") {
  try {
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      maxContentLength: 25 * 1024 * 1024,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": referer,
        "Accept": "image/*,*/*"
      }
    });

    const buf = Buffer.from(r.data);
    if (buf.length < 8000) return null;
    if (buf.length > 25 * 1024 * 1024) return null;

    /* Magic bytes */
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

/* ═══════════════════════════════════════════════════════════════════
   MASTER SEARCH — tries multiple providers
   ═══════════════════════════════════════════════════════════════════ */
async function multiSearch(query, isAnime) {
  const tasks = [];

  if (isAnime) {
    /* Anime-first priority */
    tasks.push(
      { name: "konachan",  fn: () => konachanSearch(query) },
      { name: "yandere",   fn: () => yandereSearch(query) },
      { name: "safebooru", fn: () => safebooruSearch(query) },
      { name: "nekos.best",fn: () => nekosBest(query) },
      { name: "waifu.pics",fn: () => waifuPics(query) },
      { name: "bing",      fn: () => bingSearch(`${query} anime HD wallpaper`) },
      { name: "ddg",       fn: () => ddgSearch(`${query} anime HD wallpaper`) },
      { name: "searx",     fn: () => searxSearch(`${query} anime HD`) },
      { name: "wikimedia", fn: () => wikimediaSearch(query) },
      { name: "reddit",    fn: () => redditSearch(`${query} anime`) }
    );
  } else {
    tasks.push(
      { name: "bing",      fn: () => bingSearch(`${query} HD wallpaper 4k`) },
      { name: "ddg",       fn: () => ddgSearch(`${query} HD wallpaper 4k`) },
      { name: "searx",     fn: () => searxSearch(`${query} HD wallpaper`) },
      { name: "wikimedia", fn: () => wikimediaSearch(query) },
      { name: "reddit",    fn: () => redditSearch(`${query} wallpaper`) },
      { name: "bing",      fn: () => bingSearch(query) }
    );
  }

  /* Run in small parallel batches */
  const BATCH = 3;
  for (let i = 0; i < tasks.length; i += BATCH) {
    const batch = tasks.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (t) => {
        try {
          const urls = await t.fn();
          console.log(`[sayo] ${t.name}: ${urls.length} urls`);
          return urls;
        } catch (e) {
          console.log(`[sayo] ${t.name} threw: ${e.message}`);
          return [];
        }
      })
    );

    const merged = [].concat(...results);
    if (merged.length >= 10) return merged;
  }

  return [];
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════════════ */
module.exports = {
  name: "sayo",
  aliases: ["pic", "img", "image", "photo", "hdimg"],
  version: "3.0.0",
  role: 0,
  description: "Search and send HD image from web (multi-API)",
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

    raw = raw.replace(/^(sayo|pic|img|image|photo|hdimg)\s+/i, "").trim();

    const query = extractKeyword(raw) || args.join(" ").trim();

    if (!query) {
      react("❓");
      return api.sendMessage("Usage: /sayo <keyword>\nExample: /sayo luffy", threadID);
    }

    react("⏳");
    const isAnime = isAnimeQuery(query);
    console.log(`[sayo] query="${query}" anime=${isAnime}`);

    let tmp = null;

    try {
      /* STEP 1: Multi-source search */
      const urls = await multiSearch(query, isAnime);

      if (!urls.length) throw new Error("no images found from any source");

      /* STEP 2: Shuffle + dedupe, try download */
      const uniqueUrls = [...new Set(urls)].sort(() => Math.random() - 0.5);

      let buf = null;
      let ext = "jpg";
      let usedUrl = "";

      for (const url of uniqueUrls.slice(0, 20)) {
        const referer = isAnime
          ? "https://konachan.com/"
          : "https://www.bing.com/";

        const result = await downloadImage(url, referer);
        if (!result) continue;

        /* Minimum 20KB for HD feel */
        if (result.buf.length < 20000) continue;

        buf = result.buf;
        ext = result.ext;
        usedUrl = url;
        console.log(`[sayo] ✅ got ${(buf.length / 1024).toFixed(0)} KB`);
        break;
      }

      if (!buf) throw new Error("all downloads failed");

      /* STEP 3: Save + send */
      tmp = path.join(os.tmpdir(), `sayo_${Date.now()}.${ext}`);
      await fs.writeFile(tmp, buf);

      react("✅");
      api.sendMessage({
        body: `🔍 ${query}${isAnime ? " (anime)" : ""}\n📦 ${(buf.length / 1024).toFixed(0)} KB`,
        attachment: fs.createReadStream(tmp)
      }, threadID, () => {
        try { fs.unlinkSync(tmp); } catch (_) {}
      });

    } catch (e) {
      console.error("[sayo] error:", e.message);
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 100)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1