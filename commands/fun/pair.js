/**
 * commands/fun/pair.js
 * NEXUS BOT V1 — Pair with auto gender detect (keyless)
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const cloudStorage = require("../../utils/cloudStorage");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const GENDER_CACHE_FILE = path.join(DATA_DIR, "gender_cache.json");

/* ═══ Gender cache ═══ */
function loadCache() {
  try { return fs.readJsonSync(GENDER_CACHE_FILE) || {}; } catch (_) { return {}; }
}
function saveCache(d) {
  try { fs.writeJsonSync(GENDER_CACHE_FILE, d); } catch (_) {}
}

/* ═══ Bangla name database (comprehensive) ═══ */
const MALE_NAMES = new Set([
  /* Common Bangla male names */
  "ariyan", "arif", "ariful", "arifin", "shihab", "sadik", "sadique", "rifat",
  "kawsar", "kausar", "tanvir", "tanveer", "tanv", "rakib", "sujon", "sojib",
  "shanto", "shakib", "tamim", "mushfiq", "mahmud", "mahin", "hasan", "hassan",
  "rahat", "raju", "shuvo", "shubho", "subho", "akash", "emon", "himel",
  "sabbir", "sajid", "sajjad", "sajib", "rahim", "karim", "hasib", "naim",
  "nayeem", "imran", "fahim", "faysal", "faisal", "sifat", "abdul", "abdullah",
  "abir", "adnan", "ahsan", "ahmed", "arham", "asif", "ashik", "ashraf",
  "ayan", "azad", "babu", "bijoy", "biplob", "bappy", "chandan", "delwar",
  "dipu", "emon", "emon", "farhan", "farhad", "fardin", "hasibul", "habib",
  "hridoy", "hridoy", "iqbal", "islam", "jamal", "jashim", "joy", "kabir",
  "kamal", "khan", "liton", "mahdi", "mahfuz", "mahir", "masud", "mehedi",
  "mizan", "monir", "monjur", "moshiur", "motiur", "munna", "muntasir",
  "mustafiz", "nadim", "nahid", "nazmul", "noman", "omar", "osman", "parvej",
  "pavel", "rabbi", "rafi", "rafiq", "rakibul", "rashed", "rashid", "rayhan",
  "rezwan", "riad", "riyad", "robiul", "ruman", "sabbir", "sagor", "sakib",
  "salauddin", "samiul", "shafayet", "shahin", "shamim", "shariful", "shawon",
  "sheikh", "shishir", "siam", "sifat", "sohel", "sohrab", "sourov", "sujon",
  "sumon", "suvo", "tahsin", "tamzid", "tasnim", "tawhid", "towhid", "tuhin",
  "zahid", "zakir", "zaman", "zihad",
  /* English male names */
  "john", "james", "robert", "michael", "william", "david", "richard", "joseph",
  "thomas", "charles", "daniel", "matthew", "anthony", "mark", "donald",
  "steven", "paul", "andrew", "joshua", "kenneth", "kevin", "brian", "george",
  "edward", "ronald", "timothy", "jason", "jeffrey", "ryan", "jacob", "gary",
  "nicholas", "eric", "jonathan", "stephen", "larry", "justin", "scott",
  "brandon", "benjamin", "samuel", "gregory", "alexander", "patrick", "frank"
]);

const FEMALE_NAMES = new Set([
  /* Common Bangla female names */
  "mim", "mimi", "mimmi", "rimi", "rimu", "tisha", "tisa", "tania", "taniya",
  "sadia", "sadika", "saima", "sanjida", "sanjeeda", "shakila", "sima", "sima",
  "sonia", "sorna", "sraboni", "susmita", "tasnim", "trisha", "triya", "jannat",
  "jerin", "jui", "juthi", "khadija", "lubna", "mahiya", "maimuna", "maria",
  "marufa", "mehjabin", "mitu", "mukta", "natasha", "nipa", "nishat", "nuri",
  "parveen", "parvin", "popy", "rahima", "rania", "raya", "rey", "ria", "riya",
  "rina", "runa", "ruma", "rupa", "sabina", "sabrina", "shila", "shilpi",
  "sumaiya", "sumi", "muna", "munni", "nila", "nusrat", "nushrat", "priya",
  "nirjhor", "afrin", "afroza", "aklima", "alifa", "amena", "amina", "anika",
  "anjuman", "arifa", "asifa", "asmani", "asma", "ayesha", "bristy", "bushra",
  "chaity", "champa", "dipa", "dipa", "disha", "eity", "elsa", "esha",
  "eva", "fabiha", "farhana", "farida", "fatema", "fatima", "fahmida",
  "ferdousi", "habiba", "halima", "hasna", "hafsa", "hira", "iffat", "isha",
  "ishrat", "jahan", "jahida", "jasmine", "jaya", "jesmin", "kajol", "kamrun",
  "kaniz", "karima", "khadiza", "kulsum", "laboni", "lamia", "lata", "liba",
  "liza", "madina", "mahfuza", "mahima", "mahmuda", "maisha", "maliha",
  "marzana", "maushumi", "meem", "meher", "mehnaz", "mim", "minhaz",
  "misti", "mita", "mohona", "monira", "mou", "mousumi", "mukta",
  "nahida", "najma", "nargis", "nasrin", "nazma", "naznin", "neela",
  "nigar", "nila", "nishita", "nishat", "noor", "nusrat", "parul",
  "panna", "papia", "papiya", "pinky", "poppy", "puja", "puspo", "rabeya",
  "rakhi", "rashida", "razia", "rehana", "rekha", "reshma", "rina", "rishita",
  "rita", "rokeya", "ruchira", "ruhi", "ruksana", "rumana", "runa", "sabana",
  "sabiha", "sabina", "sadika", "sagorika", "sahana", "sajeda", "salma",
  "samia", "samina", "samira", "sanjida", "sapna", "sathi", "sazia",
  "seema", "selina", "shabnam", "shahana", "shaheen", "shaila", "shanta",
  "sharmin", "shathi", "shefali", "sheuly", "shine", "shirin", "shova",
  "shumi", "shupti", "sima", "simi", "sneha", "sonal", "sonia", "sorna",
  "sraboni", "suborna", "suchi", "sufia", "sultana", "sumaiya", "sumi",
  "sunita", "supriya", "suraiya", "susmita", "swapna", "tahmina", "tamanna",
  "tanha", "tanjila", "tania", "taslima", "tasmia", "taspia", "tisha",
  "tithi", "trisha", "tuli", "urmi", "uzma", "yashmin", "yasmin", "zannat",
  "zarin", "zeba", "zinnat", "zobaida",
  /* English female names */
  "mary", "patricia", "jennifer", "linda", "elizabeth", "barbara", "susan",
  "jessica", "sarah", "karen", "nancy", "lisa", "margaret", "betty",
  "sandra", "ashley", "kimberly", "emily", "donna", "michelle", "carol",
  "amanda", "melissa", "deborah", "stephanie", "rebecca", "sharon",
  "laura", "cynthia", "kathleen", "amy", "angela", "shirley", "anna",
  "brenda", "pamela", "emma", "nicole", "helen", "samantha", "katherine",
  "christine", "debra", "rachel", "carolyn", "janet", "catherine", "maria"
]);

/* ═══ Name-based detect ═══ */
function detectByName(name) {
  if (!name) return null;
  const first = String(name).split(/\s+/)[0].toLowerCase().trim();
  if (!first) return null;

  if (MALE_NAMES.has(first)) return "male";
  if (FEMALE_NAMES.has(first)) return "female";

  /* Prefix */
  if (/^(mr|md|mohammad|muhammad|shah|sheikh)\s/i.test(name)) return "male";
  if (/^(mrs|miss|ms|mst|begum)\s/i.test(name)) return "female";

  return null;
}

/* ═══ Genderize.io (Free, no key) ═══ */
async function detectGenderize(name) {
  if (!name) return null;
  const first = String(name).split(/\s+/)[0].toLowerCase().trim();
  if (!first || first.length < 2) return null;

  try {
    const r = await axios.get("https://api.genderize.io", {
      params: { name: first },
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const g = r.data?.gender;
    const prob = r.data?.probability || 0;
    const count = r.data?.count || 0;

    /* Only trust high confidence */
    if (g && prob >= 0.75 && count >= 5) {
      return g;
    }
    /* Medium confidence — accept if prob high */
    if (g && prob >= 0.90) return g;

  } catch (_) {}
  return null;
}

/* ═══ Facebook gender (multiple formats) ═══ */
async function detectGenderFB(api, uid) {
  try {
    const info = await api.getUserInfo(String(uid));
    const user = info?.[uid];
    if (!user) return null;

    const g = user.gender;

    /* Number format */
    if (g === 1) return "female";
    if (g === 2) return "male";

    /* String format */
    if (typeof g === "string") {
      const low = g.toLowerCase().trim();
      if (["female", "f", "woman", "girl", "meye", "mey"].includes(low)) return "female";
      if (["male", "m", "man", "boy", "chele", "cheley"].includes(low)) return "male";
    }
  } catch (_) {}
  return null;
}

/* ═══ AI fallback ═══ */
async function detectGenderAI(name) {
  if (!name) return null;
  const first = String(name).split(/\s+/)[0];
  if (!first || first.length < 2) return null;

  const providers = [
    async () => {
      const prompt = `Bangladeshi name: "${first}". Is this male or female? Reply ONLY "male" or "female".`;
      const r = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(prompt)}`,
        { params: { model: "openai", seed: Date.now() }, timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" } }
      );
      const t = (typeof r.data === "string" ? r.data : "").toLowerCase();
      if (t.includes("female")) return "female";
      if (t.includes("male")) return "male";
      return null;
    },
    async () => {
      const prompt = `Name: ${first}. Male or Female? One word:`;
      const r = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(prompt)}`,
        { timeout: 8000, headers: { "User-Agent": "Mozilla/5.0" } }
      );
      const t = (typeof r.data === "string" ? r.data : "").toLowerCase();
      if (t.includes("female")) return "female";
      if (t.includes("male")) return "male";
      return null;
    }
  ];

  for (const fn of providers) {
    try {
      const g = await fn();
      if (g) return g;
    } catch (_) { continue; }
  }
  return null;
}

/* ═══ Master detect — 5-tier ═══ */
async function detectGender(api, uid, name) {
  const key = String(uid);

  /* 1. Cache */
  const cache = loadCache();
  if (cache[key] && cache[key].gender && Date.now() - cache[key].time < 30 * 24 * 60 * 60 * 1000) {
    return cache[key].gender;
  }

  /* 2. Facebook API */
  const fb = await detectGenderFB(api, uid);
  if (fb) {
    cache[key] = { gender: fb, time: Date.now(), source: "fb" };
    saveCache(cache);
    console.log(`[gender] ${name} → ${fb} (FB)`);
    return fb;
  }

  /* 3. Local name DB */
  const local = detectByName(name);
  if (local) {
    cache[key] = { gender: local, time: Date.now(), source: "local" };
    saveCache(cache);
    console.log(`[gender] ${name} → ${local} (LOCAL)`);
    return local;
  }

  /* 4. Genderize.io */
  const gz = await detectGenderize(name);
  if (gz) {
    cache[key] = { gender: gz, time: Date.now(), source: "genderize" };
    saveCache(cache);
    console.log(`[gender] ${name} → ${gz} (GENDERIZE)`);
    return gz;
  }

  /* 5. AI fallback */
  const ai = await detectGenderAI(name);
  if (ai) {
    cache[key] = { gender: ai, time: Date.now(), source: "ai" };
    saveCache(cache);
    console.log(`[gender] ${name} → ${ai} (AI)`);
    return ai;
  }

  console.log(`[gender] ${name} → UNKNOWN`);
  return null;
}

/* ═══ Get FB avatar ═══ */
async function getAvatar(uid) {
  const urls = [
    `https://graph.facebook.com/${uid}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
    `https://graph.facebook.com/${uid}/picture?type=large&width=720&height=720`
  ];
  for (const url of urls) {
    try {
      const r = await axios.get(url, {
        responseType: "arraybuffer", timeout: 15000, maxRedirects: 5,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const b = Buffer.from(r.data);
      if (b.length > 1000) return b;
    } catch (_) { continue; }
  }
  return null;
}

/* ═══ Load cloud bg ═══ */
async function loadPairBackground(config) {
  try {
    const ownerID = String(config.ownerID);
    const buf = await cloudStorage.getCloudFileBuffer(ownerID, "pair2", { maxSize: 20 * 1024 * 1024 });
    if (buf) return buf;
    const random = await cloudStorage.getRandomCloudBuffer(ownerID, "pair2-", { maxSize: 20 * 1024 * 1024 });
    if (random) return random;
  } catch (_) {}
  return null;
}

/* ═══ Draw PP ═══ */
async function drawPP(ctx, buf, cx, cy, r, borderColor = "#ffffff", bw = 6) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();

  if (buf) {
    try {
      const img = await loadImage(buf);
      ctx.clip();
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, cx - r, cy - r, r * 2, r * 2);
    } catch (_) { ctx.fillStyle = "#333"; ctx.fill(); }
  } else {
    ctx.fillStyle = "#333";
    ctx.fill();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = bw;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 77, 136, 0.9)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

/* ═══ MAIN ═══ */
module.exports = {
  name: "pair",
  aliases: ["ship", "love", "couple", "match"],
  version: "4.0.0",
  role: 0,
  description: "Pair with auto gender detect",
  usage: "/pair",
  category: "fun",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    if (!event.isGroup) { react("❌"); return api.sendMessage("❌ Group only", threadID); }

    react("⏳");

    try {
      /* ═══ Sender info ═══ */
      let senderInfo = null;
      try {
        const ui = await api.getUserInfo(String(senderID));
        senderInfo = ui[String(senderID)];
      } catch (_) {}

      if (!senderInfo || !senderInfo.name) {
        react("❌");
        return api.sendMessage("❌ Could not read profile", threadID);
      }

      const senderGender = await detectGender(api, senderID, senderInfo.name);
      console.log(`[pair] sender: ${senderInfo.name} → ${senderGender}`);

      if (!senderGender) {
        react("❌");
        return api.sendMessage(
          "❌ Could not detect your gender.\n" +
          "💡 Set gender on Facebook profile and try again.",
          threadID
        );
      }

      /* ═══ Fetch all members ═══ */
      const threadInfo = await api.getThreadInfo(threadID);
      const members = threadInfo.participantIDs || [];
      const me = String(api.getCurrentUserID());
      const realMembers = members.filter((id) => String(id) !== me && String(id) !== String(senderID));

      const wantedGender = senderGender === "male" ? "female" : "male";
      const pool = [];

      /* ═══ Batch process ═══ */
      const BATCH = 25;
      for (let i = 0; i < realMembers.length; i += BATCH) {
        const batch = realMembers.slice(i, i + BATCH);
        let batchInfo = {};
        try { batchInfo = await api.getUserInfo(batch); } catch (_) {}

        for (const id of batch) {
          const info = batchInfo[String(id)];
          if (!info || !info.name) continue;
          const g = await detectGender(api, id, info.name);
          if (g === wantedGender) {
            pool.push({ id: String(id), name: info.name });
          }
        }
      }

      console.log(`[pair] pool (${wantedGender}): ${pool.length}`);

      if (pool.length === 0) {
        react("❌");
        const label = wantedGender === "male" ? "chele" : "meye";
        return api.sendMessage(`❌ Group e kono ${label} pawa gelo na`, threadID);
      }

      const partner = pool[Math.floor(Math.random() * pool.length)];
      const boy = senderGender === "male" ? { id: String(senderID), name: senderInfo.name } : partner;
      const girl = senderGender === "female" ? { id: String(senderID), name: senderInfo.name } : partner;

      const lovePct = 50 + Math.floor(Math.random() * 51);

      const [boyPP, girlPP, bgBuf] = await Promise.all([
        getAvatar(boy.id).catch(() => null),
        getAvatar(girl.id).catch(() => null),
        loadPairBackground(config).catch(() => null)
      ]);

      const W = 1000;
      const H = 480;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      if (bgBuf) {
        const bgImg = await loadImage(bgBuf);
        const aspectImg = bgImg.width / bgImg.height;
        const aspectBox = W / H;
        let bgW = W, bgH = H, offsetX = 0, offsetY = 0;
        if (aspectImg > aspectBox) {
          bgH = H; bgW = H * aspectImg; offsetX = -(bgW - W) / 2;
        } else {
          bgW = W; bgH = W / aspectImg; offsetY = -(bgH - H) / 2;
        }
        ctx.drawImage(bgImg, offsetX, offsetY, bgW, bgH);

        /* Cover existing PPs */
        [[W * 0.646, H * 0.42], [W * 0.935, H * 0.745]].forEach(([x, y]) => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, W * 0.098, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.restore();
        });

        await drawPP(ctx, boyPP, W * 0.646, H * 0.42, W * 0.095, "#ffffff", 6);
        await drawPP(ctx, girlPP, W * 0.935, H * 0.745, W * 0.095, "#ffffff", 6);
      } else {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#ff9a9e");
        grad.addColorStop(0.5, "#fecfef");
        grad.addColorStop(1, "#a18cd1");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        await drawPP(ctx, boyPP, W * 0.25, H / 2, 110, "#00ff88", 8);
        await drawPP(ctx, girlPP, W * 0.75, H / 2, 110, "#ff2266", 8);
      }

      /* ═══ Banner ═══ */
      const bh = 45;
      const bg2 = ctx.createLinearGradient(0, H - bh, 0, H);
      bg2.addColorStop(0, "rgba(0,0,0,0)");
      bg2.addColorStop(1, "rgba(0,0,0,0.75)");
      ctx.fillStyle = bg2;
      ctx.fillRect(0, H - bh, W, bh);

      ctx.textAlign = "center";
      ctx.font = "bold 22px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 6;
      ctx.fillText(
        `💕 ${boy.name.split(" ")[0]} + ${girl.name.split(" ")[0]} = ${lovePct}%`,
        W / 2, H - 14
      );
      ctx.shadowBlur = 0;

      const tmpPath = path.join(os.tmpdir(), `pair_${Date.now()}.png`);
      await fs.writeFile(tmpPath, canvas.toBuffer("image/png"));

      react("💕");
      api.sendMessage({
        body: `💕 ${boy.name} + ${girl.name} = ${lovePct}%`,
        mentions: [
          { tag: boy.name, id: boy.id },
          { tag: girl.name, id: girl.id }
        ],
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => { try { fs.unlinkSync(tmpPath); } catch (_) {} });

    } catch (e) {
      console.error("[pair] error:", e.message);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 80)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1