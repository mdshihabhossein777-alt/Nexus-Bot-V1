/**
 * commands/imagegen/sayo.js
 * NEXUS BOT V1 — Search HD image from web
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══ Bing Image Search Scraper ═══ */
async function bingImageSearch(query) {
  try {
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`;
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

    /* Pattern 1: murl with entity encoding */
    const regex1 = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/g;
    let m;
    while ((m = regex1.exec(html)) !== null && urls.length < 30) {
      const u = m[1].replace(/\\u002f/gi, "/").replace(/\\/g, "");
      if (u.match(/\.(jpg|jpeg|png|webp)/i)) urls.push(u);
    }

    /* Pattern 2: murl JSON */
    if (!urls.length) {
      const regex2 = /"murl":"(https?:\/\/[^"]+)"/g;
      while ((m = regex2.exec(html)) !== null && urls.length < 30) {
        const u = m[1].replace(/\\u002f/gi, "/").replace(/\\/g, "");
        if (u.match(/\.(jpg|jpeg|png|webp)/i)) urls.push(u);
      }
    }

    return urls;
  } catch (e) {
    console.log("[sayo] bing fail: " + e.message);
    return [];
  }
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

module.exports = {
  name: "sayo",
  aliases: ["pic", "img", "image", "photo", "hdimg"],
  version: "1.0.0",
  role: 0,
  description: "Search and send HD image from web",
  usage: "~sayo <keyword>",
  category: "imagegen",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, body } = event;
    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Extract search query ═══ */
    let raw = (body || "").trim();

    /* Remove prefix */
    const prefix = config.prefix || "/";
    if (raw.startsWith(prefix)) raw = raw.slice(prefix.length).trim();

    /* Remove command word */
    raw = raw.replace(/^sayo\s+/i, "")
             .replace(/^pic\s+/i, "")
             .replace(/^img\s+/i, "")
             .replace(/^image\s+/i, "")
             .replace(/^photo\s+/i, "")
             .replace(/^hdimg\s+/i, "")
             .trim();

    const query = extractKeyword(raw) || args.join(" ").trim();

    if (!query) {
      react("❓");
      return api.sendMessage("Usage: ~sayo <keyword>\nExample: ~sayo luffy", threadID);
    }

    react("⏳");
    console.log(`[sayo] searching: "${query}"`);

    let tmp = null;
    try {
      /* ═══ Search HD first ═══ */
      let urls = await bingImageSearch(`${query} HD wallpaper 4k`);
      if (urls.length < 5) {
        const urls2 = await bingImageSearch(query);
        urls = urls.concat(urls2);
      }

      if (!urls.length) throw new Error("no image found");

      /* ═══ Try download from shuffled list ═══ */
      const shuffled = [...new Set(urls)].sort(() => Math.random() - 0.5);
      let buf = null;

      for (const url of shuffled.slice(0, 10)) {
        try {
          const img = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 12000,
            maxContentLength: 20 * 1024 * 1024,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Referer": "https://www.bing.com/"
            }
          });

          const b = Buffer.from(img.data);

          /* Skip small (< 30KB) and huge (> 20MB) */
          if (b.length < 30000) continue;
          if (b.length > 20 * 1024 * 1024) continue;

          /* Verify magic bytes */
          const isJPG = b[0] === 0xFF && b[1] === 0xD8;
          const isPNG = b[0] === 0x89 && b[1] === 0x50;
          const isWEBP = b.slice(0, 4).toString() === "RIFF";

          if (!isJPG && !isPNG && !isWEBP) continue;

          buf = b;
          console.log(`[sayo] got image: ${(b.length / 1024).toFixed(0)} KB`);
          break;
        } catch (_) { continue; }
      }

      if (!buf) throw new Error("all downloads failed");

      /* ═══ Detect extension ═══ */
      let ext = "jpg";
      if (buf[0] === 0x89 && buf[1] === 0x50) ext = "png";
      else if (buf.slice(0, 4).toString() === "RIFF") ext = "webp";

      /* ═══ Save as proper image file ═══ */
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