/**
 * commands/imagegen/waifu.js
 * NEXUS BOT V1 — Random SFW anime image (multi-API)
 * © 2026
 */

"use strict";

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══════════════════════════════════════════════════════════════════
   CATEGORIES
   ═══════════════════════════════════════════════════════════════════ */
const CATEGORIES = [
  "waifu", "neko", "kitsune", "husbando",
  "shinobu", "megumin", "awoo", "dance",
  "smile", "wave", "happy", "wink",
  "blush", "cuddle", "hug", "pat",
  "highfive", "handhold", "bite", "poke"
];

/* Image extensions only (skip GIFs from waifu.pics) */
const IMG_EXT = /\.(jpg|jpeg|png|webp)(\?|$)/i;

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 1: nekos.best  (returns JSON with url)
   ═══════════════════════════════════════════════════════════════════ */
async function nekosBest(category) {
  const map = {
    waifu: "waifu", neko: "neko", kitsune: "kitsune", husbando: "husbando"
  };
  const cat = map[category] || "neko";

  try {
    const r = await axios.get(`https://nekos.best/api/v2/${cat}?amount=5`, {
      timeout: 10000
    });
    const results = r.data?.results || [];
    const urls = results.map((x) => x.url).filter((u) => u && IMG_EXT.test(u));
    if (urls.length) console.log("[waifu] ✅ nekos.best");
    return urls;
  } catch (e) {
    console.log("[waifu] nekos.best err:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 2: waifu.pics  (SFW)
   ═══════════════════════════════════════════════════════════════════ */
async function waifuPics(category) {
  const valid = [
    "waifu", "neko", "shinobu", "megumin", "bully",
    "cuddle", "cry", "hug", "awoo", "kiss",
    "lick", "pat", "smug", "bonk", "yeet",
    "blush", "smile", "wave", "highfive", "handhold",
    "nom", "bite", "glomp", "slap", "kill",
    "kick", "happy", "wink", "poke", "dance"
  ];
  const cat = valid.includes(category) ? category : "waifu";

  try {
    const r = await axios.get(`https://api.waifu.pics/sfw/${cat}`, {
      timeout: 10000
    });
    const u = r.data?.url;
    if (u && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(u)) {
      console.log("[waifu] ✅ waifu.pics");
      return [u];
    }
    return [];
  } catch (e) {
    console.log("[waifu] waifu.pics err:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 3: nekos.life  (legacy, still works)
   ═══════════════════════════════════════════════════════════════════ */
async function nekosLife(category) {
  const map = {
    waifu: "waifu", neko: "neko", kitsune: "kitsune", husbando: "husbando",
    hug: "hug", pat: "pat", kiss: "kiss", cuddle: "cuddle"
  };
  const cat = map[category];
  if (!cat) return [];

  try {
    const r = await axios.get(`https://nekos.life/api/v2/img/${cat}`, {
      timeout: 10000
    });
    const u = r.data?.url;
    if (u && IMG_EXT.test(u)) {
      console.log("[waifu] ✅ nekos.life");
      return [u];
    }
    return [];
  } catch (e) {
    console.log("[waifu] nekos.life err:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 4: Konachan (SFW anime wallpaper)
   ═══════════════════════════════════════════════════════════════════ */
async function konachan(category) {
  try {
    const tagMap = {
      waifu: "rating:safe",
      neko: "cat_girl rating:safe",
      kitsune: "fox_girl rating:safe"
    };
    const tag = tagMap[category] || "rating:safe";
    const url = `https://konachan.com/post.json?tags=${encodeURIComponent(tag)}&limit=10`;

    const r = await axios.get(url, {
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0 NEXUS-BOT/1.0" }
    });

    const posts = Array.isArray(r.data) ? r.data : [];
    const urls = posts
      .map((p) => p.file_url || p.preview_url)
      .filter((u) => u && IMG_EXT.test(u));

    if (urls.length) console.log("[waifu] ✅ konachan");
    return urls;
  } catch (e) {
    console.log("[waifu] konachan err:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 5: Safebooru
   ═══════════════════════════════════════════════════════════════════ */
async function safebooru(category) {
  try {
    const tagMap = {
      waifu: "1girl solo",
      neko: "cat_girl solo",
      kitsune: "fox_girl solo",
      husbando: "1boy solo"
    };
    const tag = tagMap[category];
    if (!tag) return [];

    const url = `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=10&tags=${encodeURIComponent(tag)}`;

    const r = await axios.get(url, {
      timeout: 12000,
      headers: { "User-Agent": "Mozilla/5.0 NEXUS-BOT/1.0" }
    });

    const posts = Array.isArray(r.data) ? r.data : [];
    const urls = posts
      .map((p) => p.image ? `https://safebooru.org/images/${p.directory}/${p.image}` : null)
      .filter((u) => u && IMG_EXT.test(u));

    if (urls.length) console.log("[waifu] ✅ safebooru");
    return urls;
  } catch (e) {
    console.log("[waifu] safebooru err:", e.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MULTI-SOURCE FETCH
   ═══════════════════════════════════════════════════════════════════ */
async function fetchAll(category) {
  const tasks = [
    { name: "nekos.best", fn: () => nekosBest(category) },
    { name: "waifu.pics", fn: () => waifuPics(category) },
    { name: "nekos.life", fn: () => nekosLife(category) },
    { name: "konachan",   fn: () => konachan(category) },
    { name: "safebooru",  fn: () => safebooru(category) }
  ];

  const results = await Promise.all(
    tasks.map(async (t) => {
      try {
        return await t.fn();
      } catch (_) {
        return [];
      }
    })
  );

  const merged = [].concat(...results);
  const unique = [...new Set(merged)];
  return unique;
}

/* ═══════════════════════════════════════════════════════════════════
   IMAGE DOWNLOADER with validation
   ═══════════════════════════════════════════════════════════════════ */
function detectImageExt(buf) {
  if (!buf || buf.length < 100) return null;
  if (buf[0] === 0xFF && buf[1] === 0xD8) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "png";
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return "webp";
  if (buf.slice(0, 3).toString() === "GIF") return "gif";
  return null;
}

async function downloadImage(url) {
  try {
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      maxContentLength: 20 * 1024 * 1024,
      maxRedirects: 5,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.google.com/",
        "Accept": "image/*,*/*"
      }
    });

    const buf = Buffer.from(r.data);
    if (buf.length < 5000) return null;
    if (buf.length > 20 * 1024 * 1024) return null;

    const ext = detectImageExt(buf);
    if (!ext) return null;

    return { buf, ext };
  } catch (_) {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════════════ */
module.exports = {
  name: "waifu",
  aliases: ["animepic", "animeimg", "animegirl", "nekopic"],
  version: "1.0.0",
  role: 0,
  description: "Random SFW anime image (multi-source)",
  usage: "/waifu [category]",
  category: "imagegen",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, body } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* Parse category from args or body */
    let category = "waifu";
    let rawArgs = (args || []).slice();

    if (!rawArgs.length && body) {
      const prefix = config.prefix || "/";
      let raw = body.trim();
      if (raw.startsWith(prefix)) raw = raw.slice(prefix.length).trim();
      raw = raw.replace(/^(waifu|animepic|animeimg|animegirl|nekopic)\s*/i, "").trim();
      rawArgs = raw ? raw.split(/\s+/) : [];
    }

    if (rawArgs[0]) {
      const cat = String(rawArgs[0]).toLowerCase();
      if (CATEGORIES.includes(cat)) category = cat;
    }

    react("⏳");
    console.log(`[waifu] category=${category}`);

    try {
      const urls = await fetchAll(category);
      if (!urls.length) throw new Error("no images from any source");

      /* Shuffle */
      const shuffled = urls.sort(() => Math.random() - 0.5);

      let picked = null;
      let downloaded = null;

      for (const url of shuffled.slice(0, 15)) {
        const result = await downloadImage(url);
        if (result) {
          picked = url;
          downloaded = result;
          break;
        }
      }

      if (!downloaded) throw new Error("all downloads failed");

      const tmp = path.join(os.tmpdir(), `waifu_${Date.now()}.${downloaded.ext}`);
      await fs.writeFile(tmp, downloaded.buf);

      react("✅");
      api.sendMessage({
        body: `🎴 ${category}\n📦 ${(downloaded.buf.length / 1024).toFixed(0)} KB`,
        attachment: fs.createReadStream(tmp)
      }, threadID, (err) => {
        try { fs.unlinkSync(tmp); } catch (_) {}
        if (err) console.error("[waifu] send err:", err.message);
      });

    } catch (e) {
      console.error("[waifu] error:", e.message);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 100)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1