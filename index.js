"use strict";

/* ============================================================================
   NEXUS BOT V1 — "The Connected Light"
   Core Runtime  |  @dongdev/fca-unofficial  |  NO DATABASE  |  Keep-Alive
   Owner: Ariyan Shihab  |  Prefix: /  |  2026 Safe Build
   ============================================================================ */

require("dotenv").config();
try { require("@denzy-official/youtube_scraper"); } catch (_) {}

const fs        = require("fs-extra");
const os        = require("os");
const path      = require("path");
const http      = require("http");
const axios     = require("axios");
const NodeCache = require("node-cache");
const login     = require("@dongdev/fca-unofficial");

/* ---------------------------------------------------------------------------
   1. CONFIG
   --------------------------------------------------------------------------- */
const CONFIG_PATH = path.join(__dirname, "config.json");
const rawConfig = fs.existsSync(CONFIG_PATH) ? fs.readJsonSync(CONFIG_PATH) : {};

const config = {
  brandName:      rawConfig.brandName  || "NEXUS BOT V1",
  brandOwner:     rawConfig.brandOwner || "Ariyan Shihab",
  brandFB:        rawConfig.brandFB    || "YOUR FB LINK",
  ownerID:        String(process.env.OWNER_UID || rawConfig.ownerID || "YOUR_UID"),
  adminIDs:       Array.isArray(rawConfig.adminIDs) ? rawConfig.adminIDs.map(String) : [],
  prefix:         process.env.PREFIX || rawConfig.prefix || "/",
  footer:         (typeof rawConfig.footer === "string") ? rawConfig.footer : "",
  cooldown:       Number(process.env.COOLDOWN   || rawConfig.cooldown   || 5000),
  sendDelay:      Number(process.env.SEND_DELAY || rawConfig.sendDelay  || 1200),
  autoDlCooldown: Number(process.env.AUTO_DL_COOLDOWN || rawConfig.autoDlCooldown || 10000),
  port:           Number(process.env.PORT || 3000)
};

const isOwnerOrAdmin = (userID) => {
  const id = String(userID);
  return id === config.ownerID || config.adminIDs.includes(id);
};

const START_TIME = Date.now();
const log  = (...a) => console.log("[NEXUS]", ...a);
const warn = (...a) => console.warn("[NEXUS]", ...a);
const errl = (...a) => console.error("[NEXUS]", ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------------------
   2. CACHE
   --------------------------------------------------------------------------- */
const cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
});

const groupInfoCache = new Map();
const GROUP_CACHE_TTL = 30 * 60 * 1000;

function getCachedGroupInfo(threadID) {
  const e = groupInfoCache.get(String(threadID));
  if (e && Date.now() - e.time < GROUP_CACHE_TTL) return e.data;
  return null;
}

function setCachedGroupInfo(threadID, data) {
  groupInfoCache.set(String(threadID), { data, time: Date.now() });
}

/* ---------------------------------------------------------------------------
   3. APPSTATE LOADER
   --------------------------------------------------------------------------- */
function loadAppState() {
  const raw = process.env.APPSTATE || process.env.APP_STATE;
  if (raw && raw.trim().length > 2) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (e) {
      try {
        const decoded = Buffer.from(raw, "base64").toString("utf8");
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch (_) {}
      errl("APPSTATE env var set but could not be parsed.");
    }
  }
  const p = path.join(__dirname, "appstate.json");
  if (fs.existsSync(p)) {
    try {
      const j = fs.readJsonSync(p);
      if (Array.isArray(j) && j.length) return j;
    } catch (e) {
      errl("appstate.json is not valid JSON.");
    }
  }
  return null;
}

/* ---------------------------------------------------------------------------
   3b. AUTO BOT-NICKNAME
   --------------------------------------------------------------------------- */
const BOTNICK_FILE = path.join(__dirname, "botnick.json");

function loadBotNickConfig() {
  try {
    if (fs.existsSync(BOTNICK_FILE)) {
      const cfg = fs.readJsonSync(BOTNICK_FILE);
      return {
        enabled:      cfg.enabled !== false,
        nickname:     String(cfg.nickname || "NEXUS BOT").trim(),
        emojiPrefix:  String(cfg.emojiPrefix || "").trim(),
        appendBotTag: !!cfg.appendBotTag
      };
    }
  } catch (e) {
    errl("botnick.json invalid:", e.message);
  }
  return { enabled: false, nickname: "NEXUS BOT", emojiPrefix: "", appendBotTag: false };
}

function buildFinalNickname(cfg) {
  let n = cfg.nickname || "NEXUS BOT";
  if (cfg.emojiPrefix) n = `${cfg.emojiPrefix} ${n}`;
  if (cfg.appendBotTag) n = `${n} 🤖`;
  return n.slice(0, 32);
}

let botNickConfig = loadBotNickConfig();

/* ---------------------------------------------------------------------------
   4. JSON FILE STORAGE
   --------------------------------------------------------------------------- */
const DATA_DIR = path.join(__dirname, "data");
fs.ensureDirSync(DATA_DIR);

const GROUPS_FILE = path.join(DATA_DIR, "groups.json");
const USERS_FILE  = path.join(DATA_DIR, "users.json");

let groupsDB = {};
let usersDB  = {};
let saveTimer = null;

try { groupsDB = fs.readJsonSync(GROUPS_FILE) || {}; } catch (_) { groupsDB = {}; }
try { usersDB  = fs.readJsonSync(USERS_FILE)  || {}; } catch (_) { usersDB  = {}; }

function cleanObject(obj) {
  return JSON.parse(JSON.stringify(obj, (k, v) => (typeof v === "function" ? undefined : v)));
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    try { fs.writeJsonSync(GROUPS_FILE, cleanObject(groupsDB), { spaces: 0 }); } catch (e) { errl("groups save:", e.message); }
    try { fs.writeJsonSync(USERS_FILE,  cleanObject(usersDB),  { spaces: 0 }); } catch (e) { errl("users save:",  e.message); }
    saveTimer = null;
  }, 1000);
}

function attachMethods(obj, type) {
  if (!obj || typeof obj !== "object") return obj;
  if (typeof obj.save === "function") return obj;

  Object.defineProperty(obj, "save", {
    value: async function () { scheduleSave(); return obj; },
    enumerable: false, writable: true, configurable: true
  });

  Object.defineProperty(obj, "markModified", {
    value: function () { scheduleSave(); return obj; },
    enumerable: false, writable: true, configurable: true
  });

  return obj;
}

function defaultGroup(id) {
  return {
    groupID: String(id),
    name: "",
    cmdCount: 0,
    createdAt: new Date().toISOString(),
    warnings: {},
    banned: [],
    settings: {
      antilink: false,
      antilinkAction: "warn",
      antilinkMaxWarn: 3,
      antilinkWhitelist: [
        "github.com", "youtube.com", "youtu.be",
        "google.com", "wikipedia.org", "render.com"
      ],
      antibot: false, antispam: false,
      welcome: true, goodbye: true, joinNoti: true, leaveNoti: true,
      autoseen: false, mute: false, autoDownload: true,
      adminOnly: false, approved: [], lockedNicks: {},
      prefix: "", welcomeMsg: "", goodbyeMsg: "", rules: ""
    }
  };
}

function defaultUser(id) {
  return {
    userID: String(id),
    balance: 0, bank: 0,
    dailyClaim: null, weeklyClaim: null, monthlyClaim: null,
    inventory: {}, job: "", lastWork: null,
    createdAt: new Date().toISOString()
  };
}

async function getGroup(threadID) {
  const id = String(threadID);
  if (!groupsDB[id]) {
    groupsDB[id] = defaultGroup(id);
    scheduleSave();
  }
  const g = groupsDB[id];
  g.settings = Object.assign(defaultGroup(id).settings, g.settings || {});
  attachMethods(g, "group");
  return g;
}

async function getUser(userID) {
  const id = String(userID);
  if (!usersDB[id]) {
    usersDB[id] = defaultUser(id);
    scheduleSave();
  }
  const u = usersDB[id];
  attachMethods(u, "user");
  return u;
}

const adminCache = new Map();
async function isAdmin(api, threadID, userID) {
  if (isOwnerOrAdmin(userID)) return true;
  const now = Date.now();
  let entry = adminCache.get(String(threadID));
  if (!entry || now - entry.time > 60_000) {
    try {
      const info = await api.getThreadInfo(threadID);
      entry = {
        ids: (info.adminIDs || []).map((a) => String(a.id || a)),
        time: now
      };
      adminCache.set(String(threadID), entry);
    } catch (e) { return false; }
  }
  return entry.ids.includes(String(userID));
}

/* ---------------------------------------------------------------------------
   5. DB OBJECT
   --------------------------------------------------------------------------- */
const votes = new Map();

const db = {
  getGroup, getUser, isAdmin, votes,
  config, cache,

  Group: {
    findOne: async ({ groupID }) => {
      const g = groupsDB[String(groupID)];
      return g ? attachMethods(g, "group") : null;
    },
    create: async ({ groupID }) => {
      groupsDB[String(groupID)] = defaultGroup(groupID);
      scheduleSave();
      return attachMethods(groupsDB[String(groupID)], "group");
    },
    countDocuments: async () => Object.keys(groupsDB).length
  },

  User: {
    findOne: async ({ userID }) => {
      const u = usersDB[String(userID)];
      return u ? attachMethods(u, "user") : null;
    },
    create: async ({ userID }) => {
      usersDB[String(userID)] = defaultUser(userID);
      scheduleSave();
      return attachMethods(usersDB[String(userID)], "user");
    },

    find: () => {
      let limitN = 9999;
      let sortKey = null;
      let sortDir = -1;

      const chain = {
        sort: (s) => {
          const keys = Object.keys(s || {});
          if (keys.length) { sortKey = keys[0]; sortDir = s[sortKey]; }
          return chain;
        },
        select: () => chain,
        limit: (n) => { limitN = n; return chain; },
        skip: () => chain,
        lean: async () => {
          let arr = Object.values(usersDB).map((u) => attachMethods(u, "user"));
          if (sortKey) {
            arr.sort((a, b) => {
              const av = (a[sortKey] || 0);
              const bv = (b[sortKey] || 0);
              return sortDir === -1 ? bv - av : av - bv;
            });
          } else {
            arr.sort((a, b) => {
              const av = (a.balance || 0) + (a.bank || 0);
              const bv = (b.balance || 0) + (b.bank || 0);
              return bv - av;
            });
          }
          return arr.slice(0, limitN);
        }
      };
      return chain;
    },

    countDocuments: async () => Object.keys(usersDB).length
  }
};

/* ---------------------------------------------------------------------------
   6. SAFETY FILTER
   --------------------------------------------------------------------------- */
const BLOCKED_WORDS = [
  "nude", "nsfw", "sex", "porn", "xxx", "dick", "pussy", "rape",
  "kill yourself", "kys", "hentai", "onlyfans"
];

function safeText(t) {
  const low = String(t).toLowerCase();
  return !BLOCKED_WORDS.some((w) => low.includes(w));
}

const FORBIDDEN_COMMANDS = new Set([
  "hentai", "sexcheck", "hornycheck", "stonercheck",
  "gaycheck", "uglycheck", "hotcheck"
]);


/* ⚡ Bot message tracker for angry-delete system */
const BOT_MESSAGES = new Map();
const ANGRY_EMOJIS = ["😡", "🤬", "😠", "💢", "👿", "😾", "🖕", "👎", "🤮", "💩"];

setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, data] of BOT_MESSAGES) {
    if (data.timestamp < cutoff) BOT_MESSAGES.delete(id);
  }
}, 5 * 60 * 1000);



/* ---------------------------------------------------------------------------
   7. ANTI-BAN WRAPPER
   --------------------------------------------------------------------------- */
function wrapSendMessage(api) {
  const original = api.sendMessage.bind(api);
  const footerActive = config.footer && config.footer.trim().length > 0;

  api.sendMessage = function (message, threadID, ...rest) {
    let payload = message;

    if (footerActive) {
      try {
        if (typeof payload === "string") {
          if (!payload.includes(config.footer)) {
            payload = `${payload}\n\n${config.footer}`;
          }
        } else if (payload && typeof payload === "object" && typeof payload.body === "string") {
          if (!payload.body.includes(config.footer)) {
            payload = Object.assign({}, payload, {
              body: `${payload.body}\n\n${config.footer}`
            });
          }
        }
      } catch (_) {}
    }

    return sleep(config.sendDelay).then(
      () => new Promise((resolve) => {
        let cb = null;
        if (typeof rest[rest.length - 1] === "function") cb = rest.pop();
        try {
          original(payload, threadID, ...rest, (err, info) => {
            if (err) warn("sendMessage error:", err.message || err);

            if (!err && info && info.messageID) {
              BOT_MESSAGES.set(String(info.messageID), {
                threadID: String(threadID),
                timestamp: Date.now()
              });
            }

            if (cb) { try { cb(err, info); } catch (_) {} }
            resolve(info || null);
          });
        } catch (e) {
          warn("sendMessage threw:", e.message);
          if (cb) { try { cb(e, null); } catch (_) {} }
          resolve(null);
        }
      })
    );
  };
  return api;
}

/* ---------------------------------------------------------------------------
   8. COMMAND LOADER
   --------------------------------------------------------------------------- */
const COMMANDS_DIR = path.join(__dirname, "commands");
const CATEGORIES = ["admin", "economy", "download", "ai", "fun", "utility", "games", "owner", "custom", "imagetools", "imagegen", "cloud"];

const commands = new Map();
const linkTriggers = [];

function loadOneFile(full, category) {
  try {
    delete require.cache[require.resolve(full)];
    const cmd = require(full);
    if (!cmd || !cmd.name || typeof cmd.execute !== "function") {
      warn(`skipped ${path.basename(full)} (missing name/execute)`);
      return false;
    }

    if (category) cmd.category = category;
    else if (!cmd.category) cmd.category = "uncategorized";

    const key = String(cmd.name).toLowerCase();
    commands.set(key, cmd);
    (cmd.aliases || []).forEach((a) => commands.set(String(a).toLowerCase(), cmd));

    if (cmd.autoDownload && Array.isArray(cmd.patterns)) {
      for (const p of cmd.patterns) {
        try {
          linkTriggers.push({
            pattern: p instanceof RegExp ? p : new RegExp(p, "i"),
            command: cmd
          });
        } catch (e) {
          warn(`bad pattern in ${path.basename(full)}: ${p}`);
        }
      }
    }
    return true;
  } catch (e) {
    errl(`failed to load ${path.basename(full)}: ${e.message}`);
    return false;
  }
}

function loadCommands() {
  commands.clear();
  linkTriggers.length = 0;

  if (!fs.existsSync(COMMANDS_DIR)) {
    warn("commands/ folder not found — creating it.");
    fs.ensureDirSync(COMMANDS_DIR);
    return 0;
  }

  let total = 0;
  const entries = fs.readdirSync(COMMANDS_DIR);
  for (const name of entries) {
    const full = path.join(COMMANDS_DIR, name);
    const st = fs.statSync(full);
    if (st.isFile() && name.endsWith(".js")) {
      if (loadOneFile(full, null)) total++;
    }
  }

  for (const cat of CATEGORIES) {
    const dir = path.join(COMMANDS_DIR, cat);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));
    for (const file of files) {
      if (loadOneFile(path.join(dir, file), cat)) total++;
    }
  }

  log(`  ↳ ${linkTriggers.length} auto-download triggers registered`);
  return total;
}

/* ---------------------------------------------------------------------------
   9. AUTOMOD
   --------------------------------------------------------------------------- */
const cooldowns   = new Map();
const spamTracker = new Map();
const URL_REGEX   = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-z0-9-]+\.(com|net|org|io|ph|me|xyz|link|site|online|app|gg|tv)(\/[^\s]*)?)/i;

function isSpamming(userID, limit = 5, windowMs = 5000) {
  const now = Date.now();
  const arr = (spamTracker.get(userID) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  spamTracker.set(userID, arr);
  return arr.length > limit;
}

/* ---------------------------------------------------------------------------
   9b. BTCH AUDIO URL HELPER
   --------------------------------------------------------------------------- */
function findBtchAudioUrl(data) {
  if (!data || typeof data !== "object") return null;

  const keys = ["mp3", "audio", "url", "download_url", "downloadUrl", "link", "audioUrl"];
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && /^https?:\/\//.test(v)) return v;
  }

  if (data.result) { const r = findBtchAudioUrl(data.result); if (r) return r; }
  if (data.data)   { const r = findBtchAudioUrl(data.data);   if (r) return r; }

  if (Array.isArray(data)) {
    for (const item of data) { const r = findBtchAudioUrl(item); if (r) return r; }
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

/* ---------------------------------------------------------------------------
   10. MESSAGE HANDLER
   --------------------------------------------------------------------------- */
async function handleMessage(api, event) {
  const threadID = event.threadID;
  const senderID = String(event.senderID);
  const body     = (event.body || "").trim();

  console.log(`[DEBUG-MSG] body="${body.slice(0, 50)}" sender=${senderID} thread=${threadID} isGroup=${event.isGroup}`);

  if (!threadID || !senderID) return;



  /* ⚡ SCREENSHOT REPLY HOOK — reply to URL with "Xsc" or "sc" or "screenshot" */
  if (event.messageReply && body && /^(xsc|sc|ss|screenshot|snap|webshot)$/i.test(body.trim())) {
    try {
      console.log(`[sc-hook] triggered: "${body}"`);
      const scCmd = commands.get("screenshot");
      if (scCmd && typeof scCmd.execute === "function") {
        await scCmd.execute(api, event, [], db, config, { prefix: config.prefix, commands });
        return;
      }
    } catch (e) {
      errl("[sc-hook] error:", e.message);
    }
  }



  /* ⚡ CLOUD SAVE HOOK — "S" or "S <name>" (owner only) */
  if (event.messageReply && body && /^S(\s|$)/i.test(body.trim())) {
    try {
      const isOwner = String(senderID) === String(config.ownerID) ||
                      (config.adminIDs || []).map(String).includes(String(senderID));
      if (isOwner) {
        console.log(`[cloud-hook] triggered: "${body}"`);
        const cloudCmd = commands.get("s");
        if (cloudCmd && typeof cloudCmd.execute === "function") {
          await cloudCmd.execute(api, event, [], db, config, { prefix: config.prefix, commands });
          return;
        }
      }
    } catch (e) {
      errl("[cloud-hook] error:", e.message);
    }
  }

  /* ⚡ BLACKLIST CHECK — block blacklisted users */
  try {
    const BL_FILE = path.join(DATA_DIR, "blacklist.json");
    if (fs.existsSync(BL_FILE)) {
      const bl = fs.readJsonSync(BL_FILE) || {};
      if (bl[String(senderID)]) {
        console.log(`[blacklist] blocked: ${senderID}`);
        return;
      }
    }
  } catch (_) {}

  /* ⚡ PREFIX INFO HOOK */
  if (body) {
    try {
      const pfxCmd = commands.get("prefix");
      if (pfxCmd && typeof pfxCmd.checkTrigger === "function" &&
          typeof pfxCmd.execute === "function") {
        if (pfxCmd.checkTrigger(body)) {
          await pfxCmd.execute(api, event, [], db, config, { prefix: config.prefix, commands });
          return;
        }
      }
    } catch (e) {
      errl("[prefix-hook] error:", e.message);
    }
  }

  /* ⚡ BOT CHAT HOOK — owner-only trigger + forced reply-to */
  if (body && !body.startsWith(config.prefix)) {
    try {
      const botCmd = commands.get("bot");
      if (botCmd && typeof botCmd.execute === "function") {
        const senderIsOwnerOrAdmin = isOwnerOrAdmin(senderID);
        let shouldTrigger = false;
        let userArgs = [];

        if (senderIsOwnerOrAdmin && /^bot(\s|$)/i.test(body)) {
          shouldTrigger = true;
          const stripped = body.replace(/^bot\s*/i, "").trim();
          userArgs = stripped ? stripped.split(/\s+/) : ["hi"];
        }

        if (
          !shouldTrigger &&
          event.messageReply &&
          event.messageReply.messageID &&
          typeof botCmd.isBotReply === "function" &&
          botCmd.isBotReply(event.messageReply.messageID)
        ) {
          shouldTrigger = true;
          userArgs = [body];
        }

        if (!shouldTrigger && event.mentions && typeof event.mentions === "object") {
          const botUID = String(api.getCurrentUserID());
          if (Object.keys(event.mentions).includes(botUID)) {
            shouldTrigger = true;
            const cleaned = body.replace(/@[^\s]+/g, "").trim();
            userArgs = [cleaned || "hi"];
          }
        }

        if (shouldTrigger) {
          const _origSend = api.sendMessage.bind(api);
          const replyToID = String(event.messageID);

          api.sendMessage = function (message, tID, ...rest) {
            return _origSend(message, tID, replyToID, ...rest);
          };

          try {
            await botCmd.execute(api, event, userArgs, db, config, {
              prefix: config.prefix,
              commands
            });
          } finally {
            api.sendMessage = _origSend;
          }
          return;
        }
      }
    } catch (e) {
      errl("[bot-hook] error:", e.message);
    }
  }

  const isGroup  = !!event.isGroup;
  const isOwner  = isOwnerOrAdmin(senderID);
  const group    = isGroup ? await getGroup(threadID) : null;
  const settings = group ? group.settings : null;

  /* DND AUTO-REPLY */
  if (isGroup) {
    try {
      const DND_FILE = path.join(DATA_DIR, "dnd.json");
      if (fs.existsSync(DND_FILE)) {
        const dndData = fs.readJsonSync(DND_FILE) || {};
        const checkIDs = new Set();
        Object.keys(event.mentions || {}).forEach((id) => checkIDs.add(String(id)));
        if (event.messageReply && event.messageReply.senderID) {
          checkIDs.add(String(event.messageReply.senderID));
        }
        const isDNDCmd = /^\/(dnd|away|brb|busy|setdnd|dndmsg|setaway|customdnd)\b/i.test(body);
        if (!isDNDCmd) {
          for (const uid of checkIDs) {
            if (uid === senderID) continue;
            if (!dndData[uid] || !dndData[uid].reason) continue;
            const info = dndData[uid];
            const dur = Math.floor((Date.now() - info.since) / 1000);
            const mins = Math.floor(dur / 60);
            const timeStr = mins > 60
              ? `${Math.floor(mins / 60)}h ${mins % 60}m`
              : mins > 0 ? `${mins}m` : `${dur}s`;
            let targetName = uid;
            let senderName = senderID;
            try {
              const ui = await api.getUserInfo([uid, senderID]);
              if (ui && ui[uid] && ui[uid].name) targetName = ui[uid].name;
              if (ui && ui[senderID] && ui[senderID].name) senderName = ui[senderID].name;
            } catch (_) {}

            let replyText;
            if (info.customReply && info.customReply.trim()) {
              replyText = info.customReply
                .replace(/{name}/g, targetName)
                .replace(/{reason}/g, info.reason)
                .replace(/{time}/g, timeStr)
                .replace(/{user}/g, senderName);
            } else {
              replyText =
                `🔕 DND MODE\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `👤 ${targetName} ekhon available na.\n` +
                `📝 Reason: ${info.reason}\n` +
                `⏱️ ${timeStr} ago\n` +
                `\n💡 Pore reply dibe.`;
            }

            api.sendMessage(replyText, threadID);
            break;
          }
        }
      }
    } catch (_) {}
  }

  /* ═══ VIDEO DOWNLOADER REPLY HANDLER (/vd search) ═══ */
  if (event.messageReply && body) {
    try {
      const vdCmd = commands.get("vd");
      if (vdCmd && typeof vdCmd.handleReply === "function") {
        const handled = await vdCmd.handleReply(
          api, event, event.messageID, threadID, senderID, body
        );
        if (handled) return;
      }
    } catch (e) {
      console.error("[vd reply]", e.message);
    }
  }

  /* ═══ SONG SELECTION — 3-stage fallback ═══ */
  if (event.messageReply && body) {
    try {
      const songSearches = require("./utils/songStore");
      const search = songSearches.get(event.messageReply.messageID)
                  || songSearches.get(`fb_${threadID}_${senderID}`);

      if (search) {
        const num = parseInt(body.trim());
        if (Number.isFinite(num) && num >= 1 && num <= search.results.length) {
          const song = search.results[num - 1];
          if (search.timer) clearTimeout(search.timer);
          if (search.cleanupTimer) clearTimeout(search.cleanupTimer);
          songSearches.delete(event.messageReply.messageID);
          songSearches.delete(`fb_${threadID}_${senderID}`);

          if (event.messageID) {
            try { api.setMessageReaction("⏳", event.messageID, threadID, () => {}); } catch (_) {}
          }
          try { api.unsendMessage(event.messageReply.messageID, () => {}); } catch (_) {}

          let finalPath = null;
          let tmpPath = null;

          /* METHOD 1: yt-dlp */
          try {
            console.log(`[song] METHOD 1: yt-dlp → ${song.title}`);
            const { YtDlp } = require("ytdlp-nodejs");
            const ytdlp = new YtDlp();

            const url = `https://www.youtube.com/watch?v=${song.videoId}`;
            tmpPath = path.join(os.tmpdir(), `nexus_song_${Date.now()}.mp3`);

            const cookieCandidates = [
              path.join(__dirname, "cookies.txt"),
              path.join(__dirname, "..", "cookies.txt"),
              path.join(process.cwd(), "cookies.txt"),
              path.join(os.tmpdir(), "yt-cookies.txt"),
              "/opt/render/project/src/cookies.txt",
              "/app/cookies.txt"
            ];

            let cookiesPath = null;
            for (const c of cookieCandidates) {
              try {
                if (fs.existsSync(c)) {
                  cookiesPath = c;
                  console.log(`[song] cookies file found: ${c}`);
                  break;
                }
              } catch (_) {}
            }

            if (!cookiesPath && process.env.YT_COOKIES_B64) {
              try {
                const decoded = Buffer.from(process.env.YT_COOKIES_B64, "base64").toString("utf8");
                const tmpCookie = path.join(os.tmpdir(), "yt-cookies.txt");
                fs.writeFileSync(tmpCookie, decoded);
                cookiesPath = tmpCookie;
                console.log(`[song] cookies decoded from env (${decoded.length} chars)`);
              } catch (e) {
                console.log(`[song] cookie decode failed: ${e.message}`);
              }
            }

            console.log(`[song] yt-dlp starting... (cookies: ${cookiesPath ? "yes" : "no"})`);

            const ytdlpOpts = {
              output: tmpPath,
              audioQuality: "0",
              noWarnings: true,
              noProgress: true,
              retries: 3,
              concurrentFragments: 4,
              extractorArgs: "youtube:player_client=android,ios,web_safari"
            };

            if (cookiesPath) ytdlpOpts.cookies = cookiesPath;

            const result = await ytdlp.downloadAudio(url, "mp3", ytdlpOpts);

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

            if (finalPath && fs.existsSync(finalPath)) {
              const stat = fs.statSync(finalPath);
              console.log(`[song] yt-dlp downloaded: ${stat.size} bytes`);
              if (stat.size < 50000) {
                try { fs.unlinkSync(finalPath); } catch (_) {}
                finalPath = null;
              }
            } else {
              finalPath = null;
            }
          } catch (e) {
            console.log(`[song] METHOD 1 failed: ${e.message}`);
            finalPath = null;
          }

          /* METHOD 2: btch-downloader */
          if (!finalPath) {
            try {
              console.log(`[song] METHOD 2: btch-downloader → ${song.title}`);
              const btch = require("btch-downloader");
              const ytUrl = `https://www.youtube.com/watch?v=${song.videoId}`;

              let audioUrl = null;
              const fn = btch.youtube || btch.ytmp3 || btch.yt || btch.y2mate;

              if (typeof fn === "function") {
                const data = await fn(ytUrl);
                audioUrl = findBtchAudioUrl(data);
              }

              if (!audioUrl) {
                for (const fnName of Object.keys(btch)) {
                  if (typeof btch[fnName] !== "function") continue;
                  if (["youtube", "ytmp3", "yt", "y2mate"].includes(fnName)) continue;
                  try {
                    const data = await btch[fnName](ytUrl);
                    audioUrl = findBtchAudioUrl(data);
                    if (audioUrl) {
                      console.log(`[song] btch.${fnName} returned audio URL`);
                      break;
                    }
                  } catch (_) {}
                }
              }

              if (audioUrl) {
                const p = path.join(os.tmpdir(), `nexus_song_btch_${Date.now()}.mp3`);
                const res = await axios.get(audioUrl, {
                  responseType: "stream",
                  timeout: 120000,
                  maxContentLength: 100 * 1024 * 1024,
                  headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "*/*"
                  }
                });

                await new Promise((resolve, reject) => {
                  const w = fs.createWriteStream(p);
                  res.data.pipe(w);
                  res.data.on("error", reject);
                  w.on("error", reject);
                  w.on("finish", resolve);
                });

                const stat = fs.statSync(p);
                if (stat.size >= 50000) {
                  finalPath = p;
                  console.log(`[song] ✅ btch-downloader: ${stat.size} bytes`);
                } else {
                  try { fs.unlinkSync(p); } catch (_) {}
                  console.log(`[song] btch file too small (${stat.size} bytes)`);
                }
              } else {
                console.log(`[song] btch-downloader: no audio URL in response`);
              }
            } catch (e) {
              console.log(`[song] METHOD 2 failed: ${e.message}`);
            }
          }

          /* Send if we have file */
          if (finalPath && fs.existsSync(finalPath)) {
            api.sendMessage({
              body: "",
              attachment: fs.createReadStream(finalPath)
            }, threadID, (err) => {
              if (!err && event.messageID) {
                try { api.setMessageReaction("✅", event.messageID, threadID, () => {}); } catch (_) {}
              } else if (err) {
                console.log(`[song] send failed: ${err.message}`);
              }
              try { fs.unlinkSync(finalPath); } catch (_) {}
              if (tmpPath && tmpPath !== finalPath) {
                try { fs.unlinkSync(tmpPath); } catch (_) {}
              }
            });
            return;
          }

          /* METHOD 3: iTunes preview */
          try {
            console.log(`[song] METHOD 3: iTunes preview → ${song.title}`);
            const itunes = await axios.get("https://itunes.apple.com/search", {
              params: { term: song.title, media: "music", limit: 1 },
              timeout: 15000
            });
            const preview = itunes.data?.results?.[0]?.previewUrl;

            if (preview) {
              const a = await axios.get(preview, {
                responseType: "arraybuffer",
                timeout: 30000,
                headers: { "User-Agent": "Mozilla/5.0" }
              });
              const buf = Buffer.from(a.data);
              const p = path.join(os.tmpdir(), `nexus_song_itunes_${Date.now()}.mp3`);
              await fs.writeFile(p, buf);

              api.sendMessage({
                body: "⚠️ Full song paoa jay ni — iTunes preview (30s) pathacchi.",
                attachment: fs.createReadStream(p)
              }, threadID, () => {
                try { fs.unlinkSync(p); } catch (_) {}
                if (event.messageID) {
                  try { api.setMessageReaction("✅", event.messageID, threadID, () => {}); } catch (_) {}
                }
              });
              return;
            }
          } catch (e) {
            console.log(`[song] METHOD 3 failed: ${e.message}`);
          }

          if (event.messageID) {
            try { api.setMessageReaction("❌", event.messageID, threadID, () => {}); } catch (_) {}
          }
          api.sendMessage(
            "❌ Song download failed in all 3 methods.\n" +
            "💡 YouTube may be blocking this server. Try another song.",
            threadID
          );
          return;
        } else {
          api.sendMessage(`⚠️ Number dao 1-${search.results.length} er moddhe.`, threadID);
          return;
        }
      }
    } catch (e) {
      console.error("[song] reply error:", e.message);
    }
  }

  /* VOTE REGISTRY */
  if (event.messageReply && votes.has(event.messageReply.messageID)) {
    const v = votes.get(event.messageReply.messageID);
    const t = body.toLowerCase();
    if (t === "yes" || t === "no") {
      if (t === "yes" && !v.yes.includes(senderID)) {
        v.yes.push(senderID);
        v.no = v.no.filter((x) => x !== senderID);
      } else if (t === "no" && !v.no.includes(senderID)) {
        v.no.push(senderID);
        v.yes = v.yes.filter((x) => x !== senderID);
      }
      api.sendMessage(`🗳️ Vote counted: ${t.toUpperCase()} (Yes ${v.yes.length} / No ${v.no.length})`, threadID);
      return;
    }
  }

  /* AUTOSEEN */
  if (isGroup && settings.autoseen && typeof api.markAsRead === "function") {
    try { api.markAsRead(threadID); } catch (_) {}
  }

  const senderIsAdmin = isOwner || (isGroup ? await isAdmin(api, threadID, senderID) : false);

  /* BANNED USER */
  if (isGroup && group.banned.includes(senderID) && !senderIsAdmin) {
    try {
      await api.removeUserFromGroup(senderID, threadID);
      api.sendMessage(`🚫 <@${senderID}> was banned and has been removed.`, threadID);
    } catch (_) {}
    return;
  }

  /* MUTE */
  if (isGroup && settings.mute && !senderIsAdmin && body) {
    try { await api.deleteMessage(event.messageID); } catch (_) {}
    return;
  }

  /* ANTILINK */
  if (isGroup && settings.antilink && !senderIsAdmin && body) {
    const LINK_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(chat\.whatsapp\.com\/[^\s]+)|(wa\.me\/[^\s]+)|(t\.me\/[^\s]+)|(telegram\.me\/[^\s]+)|(discord\.gg\/[^\s]+)|(discord\.com\/invite\/[^\s]+)|(facebook\.com\/groups\/[^\s]+)|(fb\.gg\/[^\s]+)|(instagram\.com\/[^\s]+)|(insta\.gram\/[^\s]+)|([a-z0-9-]+\.(com|net|org|io|ph|me|xyz|link|site|online|app|gg|tv|info|co|us|uk|ru|in|bd)(\/[^\s]*)?)/i;

    const whitelist = (settings.antilinkWhitelist || [
      "github.com", "youtube.com", "youtu.be",
      "google.com", "wikipedia.org", "render.com"
    ]).map((d) => d.toLowerCase());

    const found = body.match(LINK_REGEX) || [];
    const bad = found.filter((l) => !whitelist.some((w) => l.toLowerCase().includes(w)));

    if (bad.length > 0) {
      try { await api.deleteMessage(event.messageID); } catch (_) {}
      if (!group.warnings) group.warnings = {};
      if (!group.warnings[senderID]) {
        group.warnings[senderID] = { count: 0, last: null };
      }
      group.warnings[senderID].count = (group.warnings[senderID].count || 0) + 1;
      group.warnings[senderID].last = new Date().toISOString();
      scheduleSave();
      const warnCount = group.warnings[senderID].count;
      const maxWarn = Number(settings.antilinkMaxWarn || 3);
      const action = settings.antilinkAction || "warn";
      if (warnCount >= maxWarn && action === "kick") {
        try { await api.removeUserFromGroup(senderID, threadID); } catch (_) {}
        api.sendMessage(`🚫 <@${senderID}> removed (${warnCount} warnings)`, threadID);
        group.warnings[senderID].count = 0;
        scheduleSave();
        return;
      }
      if (warnCount >= maxWarn && action === "mute") {
        settings.mute = true;
        scheduleSave();
        api.sendMessage(`🔇 Group muted`, threadID);
        return;
      }
      api.sendMessage(`⚠️ <@${senderID}> link removed (${warnCount}/${maxWarn})`, threadID);
      return;
    }
  }

  /* ANTIBOT */
  if (isGroup && settings.antibot && !senderIsAdmin) {
    const botLike = /^[.!?#$~^*+-]\s*[a-z]/i.test(body);
    if (botLike) {
      try { await api.deleteMessage(event.messageID); } catch (_) {}
      return;
    }
  }

  /* ANTISPAM */
  if (isGroup && settings.antispam && !senderIsAdmin && body) {
    if (isSpamming(senderID)) {
      try { await api.deleteMessage(event.messageID); } catch (_) {}
      api.sendMessage(`🛑 <@${senderID}> slow down — spam detected.`, threadID);
      spamTracker.delete(senderID);
      return;
    }
  }

  /* PREFIX */
  const prefix = (settings && settings.prefix) ? settings.prefix : config.prefix;
  const isOwnerNoPrefix = isOwner && body && !body.startsWith(prefix);

  /* ADMIN-ONLY MODE */
  if (isGroup && settings.adminOnly && !senderIsAdmin && !isOwner && body.startsWith(prefix)) {
    return api.sendMessage("🛡️ This group is in admin-only mode. Only admins can use commands.", threadID);
  }

  /* Determine command body */
  let commandBody = null;
  let isOwnerCmd = false;

  if (body.startsWith(prefix)) {
    commandBody = body.slice(prefix.length).trim();
  } else if (isOwnerNoPrefix) {
    const firstWord = body.split(/\s+/)[0].toLowerCase();
    if (commands.has(firstWord)) {
      commandBody = body.trim();
      isOwnerCmd = true;
    }
  }

  console.log(`[DEBUG-CMD] commandBody="${commandBody}" | isOwnerCmd=${isOwnerCmd}`);

  /* AUTO-LINK DOWNLOAD */
  if (body && !body.startsWith(prefix) && !isOwnerCmd && linkTriggers.length) {
    const urls = body.match(/https?:\/\/[^\s]+/gi) || [];
    if (urls.length) {
      const enabled = !isGroup || (settings && settings.autoDownload !== false);
      if (enabled) {
        for (const url of urls) {
          let matched = null;
          for (const t of linkTriggers) {
            try {
              if (t.pattern.test(url)) { matched = t.command; break; }
            } catch (_) {}
          }
          if (!matched) continue;

          const key = "ad_" + senderID;
          const last = cooldowns.get(key) || 0;
          const remain = config.autoDlCooldown - (Date.now() - last);
          if (remain > 0 && !isOwner) {
            api.sendMessage(`⏳ Auto-download cooldown: ${(remain / 1000).toFixed(1)}s`, threadID);
            return;
          }
          cooldowns.set(key, Date.now());

          log(`[auto-dl] ${matched.name} ← ${url.slice(0, 80)}`);
          try {
            await matched.execute(api, event, [url], db, config, { prefix, commands });
            if (group) {
              group.cmdCount = (group.cmdCount || 0) + 1;
              scheduleSave();
              cache.set(`group_${threadID}`, group, 30);
            }
          } catch (e) {
            errl(`auto-dl ${matched.name} failed:`, e.message);
            api.sendMessage(`❌ Auto-download failed: ${e.message}`, threadID);
          }
          return;
        }
      }
    }
    return;
  }

  if (!commandBody) {
    console.log(`[DEBUG-EXIT] no commandBody — exiting`);
    return;
  }

  /* PARSE COMMAND */
  const parts = commandBody.split(/\s+/);
  const commandName = (parts.shift() || "").toLowerCase();
  const args = parts;

  const command = commands.get(commandName);
  console.log(`[DEBUG-LOOKUP] "${commandName}" → ${command ? "FOUND" : "NOT FOUND"}`);

  if (!command) return;

  if (FORBIDDEN_COMMANDS.has(command.name)) {
    return api.sendMessage("⛔ That command is disabled for policy reasons.", threadID);
  }

  if (args.length && !safeText(args.join(" "))) {
    return api.sendMessage("⛔ Blocked content detected.", threadID);
  }

  if (!isOwner) {
    const last = cooldowns.get(senderID) || 0;
    const remaining = config.cooldown - (Date.now() - last);
    if (remaining > 0) {
      return api.sendMessage(
        `⏳ Slow down! Try again in ${(remaining / 1000).toFixed(1)}s.`,
        threadID
      );
    }
    cooldowns.set(senderID, Date.now());
    if (cooldowns.size > 5000) cooldowns.clear();
  }

  if (command.role === 1 && !senderIsAdmin) {
    return api.sendMessage("⛔ This command is for group admins only.", threadID);
  }
  if (command.role === 2 && !isOwner) {
    return api.sendMessage("⛔ This command is for the bot owner only.", threadID);
  }

  try {
    console.log(`[DEBUG-EXEC] executing: ${command.name}`);
    await command.execute(api, event, args, db, config, { prefix, commands });
    console.log(`[DEBUG-EXEC] OK: ${command.name}`);
    if (group) {
      group.cmdCount = (group.cmdCount || 0) + 1;
      scheduleSave();
      cache.set(`group_${threadID}`, group, 30);
    }
  } catch (e) {
    errl(`[${command.category || "?"}] command "${command.name}" failed:`, e.message);
    if (isOwner) {
      try {
        const { tryAutoFix } = require("./utils/autoFix");
        const stack = e.stack || "";
        const stackMatch = stack.match(/at\s+(?:.*?\s+\()?(?:file:\/\/\/)?([^\s)]*commands[\\\/][^\s:)]+\.js)/);
        let filePath = null;
        if (stackMatch) {
          filePath = stackMatch[1];
          if (!path.isAbsolute(filePath)) {
            filePath = path.join(__dirname, filePath.replace(/^.*?commands/, "commands"));
          }
        }
        if (filePath && fs.existsSync(filePath)) {
          api.sendMessage(`🔧 Error detect, AI fix korchi...`, threadID);
          const fixed = await tryAutoFix(filePath, e.message, stack);
          if (fixed) {
            try { loadCommands(); } catch (_) {}
            api.sendMessage(`✅ Auto-fix hoyeche! Abar try koro: /${command.name}`, threadID);
          } else {
            api.sendMessage(`❌ Fix fail. Error: ${e.message}`, threadID);
          }
        } else {
          api.sendMessage(`❌ Command error: ${e.message}`, threadID);
        }
      } catch (fixErr) {
        api.sendMessage(`❌ Command error: ${e.message}`, threadID);
      }
    } else {
      api.sendMessage(`❌ Command error: ${e.message}`, threadID);
    }
  }
}

/* ---------------------------------------------------------------------------
   11. EVENT HANDLER
   --------------------------------------------------------------------------- */
async function handleEvent(api, event) {
  const { threadID, logMessageType, logMessageData } = event;
  if (!threadID || !logMessageType) return;

  let group;
  try { group = await getGroup(threadID); } catch (_) { return; }
  const s = group.settings;

  /* ========== JOIN EVENT ========== */
  if (logMessageType === "log:subscribe") {
    const added = (logMessageData && logMessageData.addedParticipants) || [];
    const me = String(api.getCurrentUserID());

    const botWasAdded = added.some((p) => String(p.userFbId || p.userID || p.id) === me);
    if (botWasAdded && botNickConfig.enabled) {
      const target = buildFinalNickname(botNickConfig);
      setTimeout(async () => {
        try {
          await api.changeNickname(target, threadID, me);
          log(`[botnick] Changed own nickname to "${target}" in ${threadID}`);
        } catch (e) {
          warn(`[botnick] changeNickname failed: ${e.message}`);
        }
      }, 3000);
    }

    const addedUsers = added
      .map((p) => ({
        id: String(p.userFbId || p.userID || p.id || ""),
        name: p.fullName || p.firstName || "New Member"
      }))
      .filter((u) => u.id && u.id !== me);

    if (!addedUsers.length) return;

    const adderID = String((logMessageData && logMessageData.author) || "");

    if (!global.__welcomeBucket) global.__welcomeBucket = {};
    if (!global.__welcomeTimers) global.__welcomeTimers = {};

    if (!global.__welcomeBucket[threadID]) {
      global.__welcomeBucket[threadID] = {
        users: [],
        adderID: adderID
      };
    }

    for (const u of addedUsers) {
      const exists = global.__welcomeBucket[threadID].users.some((x) => x.id === u.id);
      if (!exists) {
        global.__welcomeBucket[threadID].users.push(u);
      }
    }

    if (global.__welcomeTimers[threadID]) {
      clearTimeout(global.__welcomeTimers[threadID]);
    }

    global.__welcomeTimers[threadID] = setTimeout(async () => {
      const bucket = global.__welcomeBucket[threadID];
      delete global.__welcomeBucket[threadID];
      delete global.__welcomeTimers[threadID];

      if (!bucket || !bucket.users.length) return;

      const totalJoined = bucket.users.length;
      log(`[welcome] 10s window closed — ${totalJoined} user(s) joined`);

      if (totalJoined >= 5) {
        log(`[welcome] ${totalJoined} >= 5 — skipping card to avoid spam`);
        return;
      }

      try {
        const { generateWelcomeCard, loadAvatar, loadGroupLogo } = require("./utils/welcomeCard");

        let groupInfo = getCachedGroupInfo(threadID);
        const t0 = Date.now();

        const adderResult = await (async () => {
          let name = "Admin";
          if (bucket.adderID && bucket.adderID !== "0" && bucket.adderID !== me) {
            try {
              const info = await api.getUserInfo(bucket.adderID);
              if (info && info[bucket.adderID] && info[bucket.adderID].name) {
                name = info[bucket.adderID].name;
              }
            } catch (_) {}
          }
          const avatar = (bucket.adderID && bucket.adderID !== "0" && bucket.adderID !== me)
            ? await loadAvatar(bucket.adderID).catch(() => null)
            : null;
          return { name, avatar };
        })();

        const [groupLogo, ...avatars] = await Promise.all([
          loadGroupLogo(threadID).catch(() => null),
          ...bucket.users.map((u) => loadAvatar(u.id).catch(() => null))
        ]);

        if (!groupInfo) {
          try {
            const tInfo = await api.getThreadInfo(threadID);
            groupInfo = {
              name: tInfo.threadName || group.name || "the group",
              memberCount: (tInfo.participantIDs || []).length,
              adminCount: (tInfo.adminIDs || []).length,
              maleCount: 0,
              femaleCount: 0
            };

            try {
              const ids = tInfo.participantIDs || [];
              const limited = ids.slice(0, 200);
              const infos = await api.getUserInfo(limited);
              for (const id of limited) {
                const g = infos[String(id)]?.gender;
                if (g === 2) groupInfo.maleCount++;
                else if (g === 1) groupInfo.femaleCount++;
              }
            } catch (_) {}

            setCachedGroupInfo(threadID, groupInfo);

            if (!group.name) {
              group.name = groupInfo.name;
              scheduleSave();
            }
          } catch (_) {
            groupInfo = {
              name: group.name || "the group",
              memberCount: 0, adminCount: 0,
              maleCount: 0, femaleCount: 0
            };
          }
        }

        const loadTime = Date.now() - t0;
        log(`[welcome] prep ${bucket.users.length} user(s) in ${loadTime}ms`);

        for (let i = 0; i < bucket.users.length; i++) {
          const u = bucket.users[i];
          const addedAvatar = avatars[i];

          try {
            const cardBuffer = await generateWelcomeCard({
              addedName: u.name,
              addedAvatar,
              adderName: adderResult.name,
              adderAvatar: adderResult.avatar,
              groupName: groupInfo.name,
              groupLogo,
              memberCount: groupInfo.memberCount,
              adminCount: groupInfo.adminCount,
              maleCount: groupInfo.maleCount,
              femaleCount: groupInfo.femaleCount
            });

            const tmpPath = path.join(os.tmpdir(), `nexus_welcome_${u.id}_${Date.now()}.png`);
            await fs.writeFile(tmpPath, cardBuffer);

            api.sendMessage({
              body: `👋 Welcome ${u.name}!`,
              mentions: [{ tag: u.name, id: u.id }],
              attachment: fs.createReadStream(tmpPath)
            }, threadID, () => {
              try { fs.unlinkSync(tmpPath); } catch (_) {}
            });
          } catch (e) {
            console.error("[welcome-card] failed:", e.message);
            api.sendMessage(`👋 Welcome ${u.name}!`, threadID);
          }

          if (i < bucket.users.length - 1) await sleep(1000);
        }

      } catch (e) {
        console.error("[welcome] batch failed:", e.message);
      }
    }, 10000);

    return;
  }

  /* NICKNAME LOCK */
  if (logMessageType === "log:user-nickname" || logMessageType === "log:nickname-change") {
    const changed = String((logMessageData && logMessageData.participant_id) || "");
    const locked = (s.lockedNicks && s.lockedNicks[changed]) || null;
    if (locked) {
      try {
        await api.changeNickname(locked, threadID, changed);
        log(`[nicklock] Restored nickname of ${changed} to "${locked}"`);
      } catch (e) {
        warn(`[nicklock] Could not restore nickname: ${e.message}`);
      }
    }
    return;
  }

  /* LEAVE EVENT */
  if (logMessageType === "log:unsubscribe") {
    const leftID = String((logMessageData && logMessageData.leftParticipantFbId) || "");
    if (leftID && leftID !== String(api.getCurrentUserID())) {
      let name = "Someone";
      try {
        const u = await api.getUserInfo(leftID);
        name = (u && u[leftID] && u[leftID].name) || name;
      } catch (_) {}
      const text = s.goodbyeMsg
        ? s.goodbyeMsg.replace(/{name}/g, name).replace(/{group}/g, group.name || "this group")
        : `👋 ${name} left the group.`;
      api.sendMessage(text, threadID);
    }
    return;
  }
}

/* ---------------------------------------------------------------------------
   12. HTTP SERVER
   --------------------------------------------------------------------------- */
function startHttpServer() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    if (req.url === "/ping") return res.end("pong");
    if (req.url === "/status") {
      return res.end(JSON.stringify({
        bot: config.brandName,
        uptime: Math.floor((Date.now() - START_TIME) / 1000) + "s",
        commands: commands.size,
        triggers: linkTriggers.length,
        groups: Object.keys(groupsDB).length,
        users: Object.keys(usersDB).length,
        owners: [config.ownerID, ...config.adminIDs],
        botNick: botNickConfig
      }, null, 2));
    }
    res.end(`${config.brandName} is running`);
  });

  server.listen(config.port, () => {
    log(`HTTP server on port ${config.port}`);
  });

  const publicUrl = process.env.RENDER_EXTERNAL_URL
                 || process.env.APP_URL
                 || process.env.PUBLIC_URL;

  if (publicUrl) {
    const PING_MS = 14 * 60 * 1000;
    setInterval(async () => {
      try {
        await axios.get(`${publicUrl}/ping`, { timeout: 10000 });
        log(`[keep-alive] pinged ${publicUrl}/ping`);
      } catch (e) {
        warn("[keep-alive] ping failed:", e.message);
      }
    }, PING_MS);
    log(`[keep-alive] Self-ping enabled → ${publicUrl}/ping`);
  } else {
    warn("[keep-alive] No RENDER_EXTERNAL_URL — self-ping disabled");
  }

  return server;
}

/* ---------------------------------------------------------------------------
   13. BOOTSTRAP
   --------------------------------------------------------------------------- */
(async function main() {
  startHttpServer();

  const loaded = loadCommands();
  log(`Loaded ${loaded} commands`);

  log(`[botnick] Auto-nickname ${botNickConfig.enabled ? "ENABLED" : "disabled"} → "${buildFinalNickname(botNickConfig)}"`);
  log(`Owners: ${[config.ownerID, ...config.adminIDs].join(", ")}`);
  log(`Footer: ${config.footer && config.footer.trim() ? `"${config.footer}"` : "(disabled)"}`);
  log(`Auto Error Fix: ENABLED`);

  try {
    const { preloadBackground } = require("./utils/welcomeCard");
    preloadBackground().then((ok) => {
      if (ok) log("[welcome] background ready ✓");
      else warn("[welcome] background will use fallback");
    }).catch(() => {});
  } catch (e) {
    warn("[welcome] preload failed:", e.message);
  }

  const appState = loadAppState();
  if (!appState) {
    errl("No appState found. Set APPSTATE env var or fill appstate.json.");
    process.exit(1);
  }

  login({ appState }, async (err, api) => {
    if (err) {
      errl("Login failed:", err && err.error ? err.error : err);
      process.exit(1);
    }

    wrapSendMessage(api);
    api.setOptions({
      listenEvents: true,
      selfListen: true,
      updatePresence: false,
      autoMarkRead: false,
      forceLogin: false,
      online: true
    });

    log("Bot started");
    log(`${config.brandName} — ${config.brandOwner}`);
    log(`Prefix: ${config.prefix} | Owner UID: ${config.ownerID}`);
    log(`Node ${process.version} | Data: ${DATA_DIR}`);

    global.NEXUS = {
      api, commands, linkTriggers, loadCommands,
      config, db, START_TIME, cache,
      groupsDB, usersDB, scheduleSave,
      botNickConfig, loadBotNickConfig, buildFinalNickname
    };

    console.log("[MQTT] listenMqtt starting...");

    api.listenMqtt(async (err, event) => {
      if (err) {
        console.log("[MQTT-ERR]", err.message || err);
        return;
      }
      if (!event || !event.type) {
        console.log("[MQTT] received event without type");
        return;
      }

      console.log(`[MQTT-EVENT] type=${event.type} body="${(event.body || "").slice(0, 30)}" sender=${event.senderID} thread=${event.threadID}`);

      try {
        if (event.type === "message" || event.type === "message_reply") {
          await handleMessage(api, event);

        } else if (event.type === "event") {
          await handleEvent(api, event);

        } else if (event.type === "message_reaction") {
          try {
            const reaction = event.reaction || "";
            const messageID = String(event.messageID || "");

            if (ANGRY_EMOJIS.includes(reaction) && BOT_MESSAGES.has(messageID)) {
              const tracked = BOT_MESSAGES.get(messageID);
              console.log(`[angry] ${reaction} detected on bot msg ${messageID}`);

              let adEnabled = true;
              try {
                const AD_FILE = path.join(DATA_DIR, "angrydel.json");
                if (fs.existsSync(AD_FILE)) {
                  const ad = fs.readJsonSync(AD_FILE) || {};
                  const tid = String(event.threadID || tracked.threadID || "");
                  adEnabled = ad[tid] !== false;
                }
              } catch (_) {}

              if (adEnabled) {
                try {
                  api.unsendMessage(messageID, (e) => {
                    if (!e) {
                      console.log(`[angry] ✅ unsent message ${messageID}`);
                      BOT_MESSAGES.delete(messageID);
                    } else {
                      console.log(`[angry] unsend fail: ${e.message || e}`);
                    }
                  });
                } catch (e) {
                  console.log(`[angry] unsend error: ${e.message}`);
                }
              }
            }
          } catch (e) {
            errl("[angry] error:", e.message);
          }
        }
      } catch (e) {
        errl("handler error:", e.message);
        errl("handler stack:", e.stack);
      }
    });
  });
})();

/* ---------------------------------------------------------------------------
   14. GLOBAL SAFETY NETS
   --------------------------------------------------------------------------- */
process.on("unhandledRejection", (r) =>
  warn("unhandledRejection:", r && r.message ? r.message : r)
);
process.on("uncaughtException", (e) =>
  errl("uncaughtException:", e && e.message ? e.message : e)
);
process.on("SIGTERM", () => {
  log("SIGTERM — saving data and shutting down.");
  try { fs.writeJsonSync(GROUPS_FILE, cleanObject(groupsDB)); } catch (_) {}
  try { fs.writeJsonSync(USERS_FILE,  cleanObject(usersDB));  } catch (_) {}
  process.exit(0);
});
process.on("SIGINT", () => {
  log("SIGINT — saving data and shutting down.");
  try { fs.writeJsonSync(GROUPS_FILE, cleanObject(groupsDB)); } catch (_) {}
  try { fs.writeJsonSync(USERS_FILE,  cleanObject(usersDB));  } catch (_) {}
  process.exit(0);
});