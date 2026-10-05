/**
 * commands/ai/tocartoon.js
 * NEXUS BOT V1 — Prompt → cartoon-style art (multi-source)
 * © 2026
 */

"use strict";

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══════════════════════════════════════════════════════════════════
   CARTOON STYLE PROMPTS
   ═══════════════════════════════════════════════════════════════════ */
const CARTOON_STYLES = [
  "cartoon style, pixar, disney, 3d render, cinematic lighting",
  "cartoon style, dreamworks, animated, soft colors, 4k",
  "cartoon style, cartoon network, 2d flat shading, bold lines",
  "cartoon style, kawaii chibi, pastel colors, cute",
  "cartoon style, comic book illustration, vibrant colors",
  "cartoon style, studio ghibli inspired, hand drawn, detailed"
];

/* ═══════════════════════════════════════════════════════════════════
   IMAGE VALIDATOR
   ═══════════════════════════════════════════════════════════════════ */
function detectImageExt(buf) {
  if (!buf || buf.length < 100) return null;

  const isJPG = buf[0] === 0xFF && buf[1] === 0xD8;
  const isPNG = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
  const isWEBP =
    buf.slice(0, 4).toString() === "RIFF" &&
    buf.slice(8, 12).toString() === "WEBP";
  const isGIF = buf.slice(0, 3).toString() === "GIF";

  if (isJPG) return "jpg";
  if (isPNG) return "png";
  if (isWEBP) return "webp";
  if (isGIF) return "gif";
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 1: Pollinations GET with multiple models
   ═══════════════════════════════════════════════════════════════════ */
const POLLINATION_MODELS = ["flux", "turbo", "kontext", "sdxl"];

async function tryPollinations(prompt, seed) {
  for (const model of POLLINATION_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const url =
          `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
          `?model=${model}&width=1024&height=1024&nologo=true&seed=${seed}&enhance=true`;

        console.log(`[tocartoon] pollinations model=${model} attempt=${attempt}`);

        const r = await axios.get(url, {
          responseType: "arraybuffer",
          timeout: 60000,
          maxContentLength: 20 * 1024 * 1024,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "image/*,*/*"
          },
          validateStatus: (s) => s >= 200 && s < 400
        });

        const buf = Buffer.from(r.data);
        const ext = detectImageExt(buf);
        if (!ext) {
          console.log(`[tocartoon] invalid image (${buf.length} bytes)`);
          continue;
        }
        if (buf.length < 5000) {
          console.log(`[tocartoon] too small (${buf.length} bytes)`);
          continue;
        }

        console.log(`[tocartoon] ✅ pollinations/${model} → ${(buf.length / 1024).toFixed(0)} KB`);
        return { buf, ext };
      } catch (e) {
        console.log(`[tocartoon] pollinations/${model} err: ${e.message}`);
      }
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 2: Pollinations short URL (no enhance)
   ═══════════════════════════════════════════════════════════════════ */
async function tryPollinationsShort(prompt, seed) {
  try {
    const short = prompt.slice(0, 200);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(short)}?seed=${seed}&nologo=true`;

    console.log(`[tocartoon] pollinations-short`);
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 60000,
      maxContentLength: 20 * 1024 * 1024,
      headers: { "User-Agent": "Mozilla/5.0" },
      validateStatus: (s) => s >= 200 && s < 400
    });

    const buf = Buffer.from(r.data);
    const ext = detectImageExt(buf);
    if (!ext || buf.length < 5000) return null;

    console.log(`[tocartoon] ✅ short → ${(buf.length / 1024).toFixed(0)} KB`);
    return { buf, ext };
  } catch (e) {
    console.log(`[tocartoon] short err: ${e.message}`);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 3: Pollinations POST
   ═══════════════════════════════════════════════════════════════════ */
async function tryPollinationsPost(prompt, seed) {
  try {
    console.log(`[tocartoon] pollinations-post`);
    const r = await axios.post(
      "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt),
      {
        model: "flux",
        width: 1024,
        height: 1024,
        seed: seed,
        nologo: true,
        enhance: true
      },
      {
        responseType: "arraybuffer",
        timeout: 60000,
        maxContentLength: 20 * 1024 * 1024,
        headers: { "User-Agent": "Mozilla/5.0" },
        validateStatus: (s) => s >= 200 && s < 400
      }
    );

    const buf = Buffer.from(r.data);
    const ext = detectImageExt(buf);
    if (!ext || buf.length < 5000) return null;

    console.log(`[tocartoon] ✅ post → ${(buf.length / 1024).toFixed(0)} KB`);
    return { buf, ext };
  } catch (e) {
    console.log(`[tocartoon] post err: ${e.message}`);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 4: Mirror domains
   ═══════════════════════════════════════════════════════════════════ */
const POLLINATION_MIRRORS = [
  "https://image.pollinations.ai",
  "https://pollinations.ai"
];

async function tryPollinationMirrors(prompt, seed) {
  for (const base of POLLINATION_MIRRORS) {
    try {
      const url =
        `${base}/prompt/${encodeURIComponent(prompt)}` +
        `?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;

      console.log(`[tocartoon] mirror ${base}`);
      const r = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 60000,
        maxContentLength: 20 * 1024 * 1024,
        headers: { "User-Agent": "Mozilla/5.0" },
        validateStatus: (s) => s >= 200 && s < 400
      });

      const buf = Buffer.from(r.data);
      const ext = detectImageExt(buf);
      if (!ext || buf.length < 5000) continue;

      console.log(`[tocartoon] ✅ mirror ${base}`);
      return { buf, ext };
    } catch (e) {
      console.log(`[tocartoon] mirror ${base} err: ${e.message}`);
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   MASTER: try all providers
   ═══════════════════════════════════════════════════════════════════ */
async function generateCartoonImage(prompt, seed) {
  const providers = [
    { name: "pollinations",       fn: () => tryPollinations(prompt, seed) },
    { name: "pollinations-short", fn: () => tryPollinationsShort(prompt, seed) },
    { name: "pollinations-post",  fn: () => tryPollinationsPost(prompt, seed) },
    { name: "pollinations-mirror",fn: () => tryPollinationMirrors(prompt, seed) }
  ];

  for (const p of providers) {
    try {
      const result = await p.fn();
      if (result && result.buf) {
        console.log(`[tocartoon] ✅ success via ${p.name}`);
        return result;
      }
    } catch (e) {
      console.log(`[tocartoon] ${p.name} threw: ${e.message}`);
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════════════ */
module.exports = {
  name: "tocartoon",
  aliases: ["cartoonify", "cartoonart", "pixar"],
  version: "2.0.0",
  role: 0,
  description: "Convert a prompt into cartoon-style art (multi-source)",
  usage: "/tocartoon <prompt>",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, body } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* Extract prompt from args OR body */
    let prompt = (args || []).join(" ").trim();
    if (!prompt && body) {
      const prefix = config.prefix || "/";
      let raw = body.trim();
      if (raw.startsWith(prefix)) raw = raw.slice(prefix.length).trim();
      raw = raw.replace(/^(tocartoon|cartoonify|cartoonart|pixar)\s+/i, "").trim();
      prompt = raw;
    }

    if (!prompt) {
      react("❓");
      return api.sendMessage(
        `🎨 Usage: /tocartoon <prompt>\n` +
        `📝 Example: /tocartoon a boy playing with a dog in a park`,
        threadID
      );
    }

    react("⏳");

    if (prompt.length > 500) prompt = prompt.slice(0, 500);

    /* Random cartoon style */
    const style = CARTOON_STYLES[Math.floor(Math.random() * CARTOON_STYLES.length)];
    const fullPrompt = `${style}, ${prompt}, highly detailed, masterpiece, best quality`;
    const seed = Math.floor(Math.random() * 999999);

    console.log(`[tocartoon] prompt: "${prompt.slice(0, 80)}"`);

    let tmpPath = null;

    try {
      const result = await generateCartoonImage(fullPrompt, seed);

      if (!result) throw new Error("all providers failed — try again or shorter prompt");

      tmpPath = path.join(os.tmpdir(), `tocartoon_${Date.now()}.${result.ext}`);
      await fs.writeFile(tmpPath, result.buf);

      react("🎨");

      api.sendMessage({
        body: `🎨 ${prompt.slice(0, 100)}\n📦 ${(result.buf.length / 1024).toFixed(0)} KB`,
        attachment: fs.createReadStream(tmpPath)
      }, threadID, (err) => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
        if (err) console.error("[tocartoon] send err:", err.message);
      });

    } catch (e) {
      console.error("[tocartoon] error:", e.message);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }

      let errLine = e.message;
      if (e.message.includes("timeout")) errLine = "network timeout — try again";
      else if (e.message.includes("all providers")) errLine = "all image APIs failed — try again";
      else if (e.message.includes("ENOTFOUND")) errLine = "network unreachable";
      else errLine = e.message.slice(0, 100);

      react("❌");
      api.sendMessage(`❌ ${errLine}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1