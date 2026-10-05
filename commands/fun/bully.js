/**
 * commands/fun/bully.js
 * NEXUS BOT V1 — Anime reaction commands (bully + 25 more)
 * © 2026
 */

"use strict";

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══════════════════════════════════════════════════════════════════
   REACTIONS MAP
   ═══════════════════════════════════════════════════════════════════ */
const REACTIONS = {
  bully:     { emoji: "😤", api: "bully",     en: "{from} is bullying {to}!",          bn: "{from} {to} ke bully korche!" },
  hug:       { emoji: "🤗", api: "hug",       en: "{from} hugs {to}!",                  bn: "{from} {to} ke hug korlo!" },
  slap:      { emoji: "✋", api: "slap",      en: "{from} slapped {to}!",               bn: "{from} {to} ke slap marlo!" },
  pat:       { emoji: "🫳", api: "pat",       en: "{from} pats {to}!",                  bn: "{from} {to} ke pat korlo!" },
  kiss:      { emoji: "😘", api: "kiss",      en: "{from} kissed {to}!",                bn: "{from} {to} ke kiss korlo!" },
  cuddle:    { emoji: "🥰", api: "cuddle",    en: "{from} cuddles {to}!",               bn: "{from} {to} ke cuddle korlo!" },
  poke:      { emoji: "👉", api: "poke",      en: "{from} poked {to}!",                 bn: "{from} {to} ke poke korlo!" },
  bite:      { emoji: "🦷", api: "bite",      en: "{from} bit {to}!",                   bn: "{from} {to} ke kamre dilo!" },
  wave:      { emoji: "👋", api: "wave",      en: "{from} waves at {to}!",              bn: "{from} {to} ke wave korlo!" },
  bonk:      { emoji: "🔨", api: "bonk",      en: "{from} bonked {to}!",                bn: "{from} {to} ke bonk korlo!" },
  yeet:      { emoji: "🚀", api: "yeet",      en: "{from} yeeted {to}!",                bn: "{from} {to} ke yeet korlo!" },
  highfive:  { emoji: "✋", api: "highfive",  en: "{from} high-fives {to}!",            bn: "{from} {to} ke highfive dilo!" },
  handhold:  { emoji: "🤝", api: "handhold",  en: "{from} holds {to}'s hand!",          bn: "{from} {to} er hath dhoreche!" },
  kick:      { emoji: "🦵", api: "kick",      en: "{from} kicked {to}!",                bn: "{from} {to} ke kick korlo!" },
  glomp:     { emoji: "🤗", api: "glomp",     en: "{from} glomped {to}!",               bn: "{from} {to} ke glomp korlo!" },
  lick:      { emoji: "👅", api: "lick",      en: "{from} licked {to}!",                bn: "{from} {to} ke lick korlo!" },
  nom:       { emoji: "🍴", api: "nom",       en: "{from} noms on {to}!",               bn: "{from} {to} ke nom korlo!" },
  smug:      { emoji: "😏", api: "smug",      en: "{from} is feeling smug!",            bn: "{from} smug feel korche!" },
  blush:     { emoji: "😊", api: "blush",     en: "{from} is blushing!",                bn: "{from} blushing!" },
  dance:     { emoji: "💃", api: "dance",     en: "{from} is dancing!",                 bn: "{from} dance korche!" },
  happy:     { emoji: "😄", api: "happy",     en: "{from} is happy!",                   bn: "{from} khushi!" },
  cry:       { emoji: "😢", api: "cry",       en: "{from} is crying!",                  bn: "{from} kanna dhorlo!" },
  wink:      { emoji: "😉", api: "wink",      en: "{from} winked!",                     bn: "{from} wink marlo!" },
  awoo:      { emoji: "🐺", api: "awoo",      en: "{from} says awoo!",                  bn: "{from} awoo bolche!" }
};

/* Which reactions need a target */
const NEED_TARGET = new Set([
  "bully", "hug", "slap", "pat", "kiss", "cuddle", "poke", "bite",
  "wave", "bonk", "yeet", "highfive", "handhold", "kick", "glomp",
  "lick", "nom"
]);

/* ═══════════════════════════════════════════════════════════════════
   PROVIDERS
   ═══════════════════════════════════════════════════════════════════ */
async function fromWaifuPics(api) {
  try {
    const r = await axios.get(`https://api.waifu.pics/sfw/${api}`, { timeout: 10000 });
    const u = r.data?.url;
    if (u && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(u)) return u;
    return null;
  } catch (e) {
    console.log(`[reaction] waifu.pics/${api} err: ${e.message}`);
    return null;
  }
}

async function fromNekosBest(api) {
  const map = {
    hug: "hug", pat: "pat", kiss: "kiss", cuddle: "cuddle",
    poke: "poke", bite: "bite", wave: "wave", highfive: "highfive",
    handhold: "handhold", dance: "dance", happy: "happy", wink: "wink",
    smile: "smile", blush: "blush", cry: "cry", baka: "baka",
    feed: "feed", slap: "slap", tickle: "tickle", smug: "smug",
    kick: "kick", stare: "stare", punch: "punch"
  };
  const cat = map[api];
  if (!cat) return null;

  try {
    const r = await axios.get(`https://nekos.best/api/v2/${cat}`, { timeout: 10000 });
    const u = r.data?.results?.[0]?.url;
    if (u && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(u)) return u;
    return null;
  } catch (e) {
    console.log(`[reaction] nekos.best/${cat} err: ${e.message}`);
    return null;
  }
}

async function fromNekosLife(api) {
  try {
    const r = await axios.get(`https://nekos.life/api/v2/img/${api}`, { timeout: 10000 });
    const u = r.data?.url;
    if (u && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(u)) return u;
    return null;
  } catch (e) {
    console.log(`[reaction] nekos.life/${api} err: ${e.message}`);
    return null;
  }
}

async function fetchReactionImage(api) {
  /* 1. waifu.pics */
  let u = await fromWaifuPics(api);
  if (u) return u;

  /* 2. nekos.best */
  u = await fromNekosBest(api);
  if (u) return u;

  /* 3. nekos.life */
  u = await fromNekosLife(api);
  if (u) return u;

  /* 4. Fallback: if bully-specific API fails, try bonk/slap as substitute */
  if (api === "bully") {
    for (const alt of ["bonk", "slap", "yeet"]) {
      u = await fromWaifuPics(alt);
      if (u) return u;
    }
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   IMAGE DOWNLOADER
   ═══════════════════════════════════════════════════════════════════ */
function detectExt(buf) {
  if (!buf || buf.length < 100) return null;
  if (buf[0] === 0xFF && buf[1] === 0xD8) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "png";
  if (buf.slice(0, 4).toString() === "RIFF") return "webp";
  if (buf.slice(0, 3).toString() === "GIF") return "gif";
  return null;
}

async function downloadImage(url) {
  try {
    const r = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      maxContentLength: 15 * 1024 * 1024,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://waifu.pics/",
        "Accept": "image/*,*/*"
      }
    });
    const buf = Buffer.from(r.data);
    if (buf.length < 2000) return null;
    const ext = detectExt(buf);
    if (!ext) return null;
    return { buf, ext };
  } catch (_) {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   NAME RESOLVER
   ═══════════════════════════════════════════════════════════════════ */
async function getNames(api, senderID, targetID) {
  const out = { from: `User`, to: `User` };
  try {
    const info = await api.getUserInfo([String(senderID), String(targetID)]);
    if (info && info[String(senderID)] && info[String(senderID)].name) {
      out.from = info[String(senderID)].name;
    }
    if (info && info[String(targetID)] && info[String(targetID)].name) {
      out.to = info[String(targetID)].name;
    }
  } catch (_) {}
  return out;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════════════ */
module.exports = {
  name: "bully",
  aliases: [
    "hug", "slap", "pat", "kiss", "cuddle", "poke", "bite",
    "wave", "bonk", "yeet", "highfive", "handhold", "kick",
    "glomp", "lick", "nom", "smug", "blush", "dance", "happy",
    "cry", "wink", "awoo"
  ],
  version: "1.0.0",
  role: 0,
  description: "Anime reaction commands (bully, hug, slap & more)",
  usage: "/bully @user (or reply to a message)",
  category: "fun",

  execute: async function (api, event, args, db, config, extras) {
    const { threadID, messageID, senderID, body, messageReply, mentions } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Detect which reaction was called ═══ */
    const prefix = (extras && extras.prefix) || config.prefix || "/";
    let action = "bully";
    const rawBody = (body || "").trim();
    const noPrefix = rawBody.startsWith(prefix) ? rawBody.slice(prefix.length).trim() : rawBody;
    const firstWord = (noPrefix.split(/\s+/)[0] || "").toLowerCase();
    if (REACTIONS[firstWord]) action = firstWord;

    const reaction = REACTIONS[action];
    if (!reaction) {
      react("❓");
      return api.sendMessage(`❓ Unknown reaction: ${action}`, threadID);
    }

    /* ═══ Find target user ═══ */
    let targetID = null;

    /* From reply */
    if (messageReply && messageReply.senderID) {
      targetID = String(messageReply.senderID);
    }

    /* From mention */
    if (!targetID && mentions && typeof mentions === "object") {
      const keys = Object.keys(mentions);
      if (keys.length) targetID = String(keys[0]);
    }

    /* Need target but none found */
    if (!targetID && NEED_TARGET.has(action)) {
      react("❓");
      return api.sendMessage(
        `${reaction.emoji} Usage:\n` +
        `• /${action} @user\n` +
        `• Reply to someone + /${action}\n\n` +
        `Available: ${Object.keys(REACTIONS).join(", ")}`,
        threadID
      );
    }

    /* If no target and it's a self-action, use sender */
    if (!targetID) targetID = String(senderID);

    react("⏳");
    console.log(`[reaction] ${action} → ${senderID} → ${targetID}`);

    try {
      /* ═══ Fetch image URL ═══ */
      const imgUrl = await fetchReactionImage(reaction.api);
      if (!imgUrl) throw new Error("no image from any source");

      /* ═══ Download ═══ */
      const dl = await downloadImage(imgUrl);
      if (!dl) throw new Error("download failed");

      /* ═══ Save temp ═══ */
      const tmp = path.join(os.tmpdir(), `react_${action}_${Date.now()}.${dl.ext}`);
      await fs.writeFile(tmp, dl.buf);

      /* ═══ Resolve names ═══ */
      const names = await getNames(api, senderID, targetID);

      /* ═══ Build caption (English + Bengali mix) ═══ */
      const caption =
        `${reaction.emoji} ${reaction.en.replace("{from}", names.from).replace("{to}", names.to)}\n` +
        `🇧🇩 ${reaction.bn.replace("{from}", names.from).replace("{to}", names.to)}`;

      /* ═══ Mentions array for tagging ═══ */
      const mentionArr = [];
      if (targetID !== String(senderID)) {
        mentionArr.push({ tag: names.to, id: String(targetID) });
      }

      react("✅");
      api.sendMessage({
        body: caption,
        mentions: mentionArr,
        attachment: fs.createReadStream(tmp)
      }, threadID, (err) => {
        try { fs.unlinkSync(tmp); } catch (_) {}
        if (err) console.error("[reaction] send err:", err.message);
      });

    } catch (e) {
      console.error("[reaction] error:", e.message);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 100)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1