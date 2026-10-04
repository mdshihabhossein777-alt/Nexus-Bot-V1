/**
 * commands/fun/pair.js
 * NEXUS BOT V1 — Pair card with cloud background
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const cloudStorage = require("../../utils/cloudStorage");

/* ═══ Gender detect — FB or AI ═══ */
async function detectGenderFB(api, uid) {
  try {
    const info = await api.getUserInfo(String(uid));
    const g = info?.[uid]?.gender;
    if (g === 1) return "female";
    if (g === 2) return "male";
  } catch (_) {}
  return null;
}

/* ═══ AI gender detect from name ═══ */
async function detectGenderAI(name) {
  if (!name) return null;
  try {
    const prompt = `Name: "${name}". Is this person male or female? Reply with ONLY one word: "male" or "female". No explanation.`;
    const r = await axios.get(
      `https://text.pollinations.ai/${encodeURIComponent(prompt)}`,
      { params: { model: "openai", seed: Date.now() }, timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const text = (typeof r.data === "string" ? r.data : "").toLowerCase().trim();
    if (text.includes("female")) return "female";
    if (text.includes("male")) return "male";
  } catch (_) {}
  return null;
}

async function detectGender(api, uid, name) {
  /* 1. Facebook first */
  const fb = await detectGenderFB(api, uid);
  if (fb) return fb;
  /* 2. AI fallback */
  return await detectGenderAI(name);
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

/* ═══ Load background from cloud ═══ */
async function loadPairBackground(config) {
  /* 1. Try cloud: pair2 */
  try {
    const ownerID = String(config.ownerID);
    const buf = await cloudStorage.getCloudFileBuffer(ownerID, "pair2", { maxSize: 20 * 1024 * 1024 });
    if (buf) {
      console.log("[pair] using cloud bg: pair2");
      return buf;
    }
    /* 2. Try prefix match: pair2-1, pair2-2, ... */
    const random = await cloudStorage.getRandomCloudBuffer(ownerID, "pair2-", { maxSize: 20 * 1024 * 1024 });
    if (random) {
      console.log("[pair] using cloud bg: random pair2");
      return random;
    }
  } catch (e) {
    console.log("[pair] cloud fail: " + e.message);
  }
  return null;
}

/* ═══ Draw circle avatar ═══ */
async function drawPP(ctx, buf, cx, cy, r, borderColor = "#ffffff", borderWidth = 6) {
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
    } catch (_) {
      ctx.fillStyle = "#333";
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#333";
    ctx.fill();
  }
  ctx.restore();

  /* Outer glow */
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = 10;
  ctx.stroke();

  /* Main ring */
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.stroke();

  /* Pink outer ring */
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 77, 136, 0.9)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

/* ═══ Main Command ═══ */
module.exports = {
  name: "pair",
  aliases: ["ship", "love", "couple", "match"],
  version: "3.0.0",
  role: 0,
  description: "Pair with random opposite gender using custom bg",
  usage: "/pair",
  category: "fun",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    if (!event.isGroup) {
      react("❌");
      return api.sendMessage("❌ Group only", threadID);
    }

    react("⏳");

    try {
      /* ═══ Sender info + gender ═══ */
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
      console.log(`[pair] sender: ${senderInfo.name} gender: ${senderGender}`);

      if (!senderGender) {
        react("❌");
        return api.sendMessage(
          "❌ Could not detect your gender.\n💡 Set gender on Facebook profile or try again.",
          threadID
        );
      }

      /* ═══ Get group members ═══ */
      const threadInfo = await api.getThreadInfo(threadID);
      const members = threadInfo.participantIDs || [];
      const me = String(api.getCurrentUserID());
      const realMembers = members.filter((id) => String(id) !== me && String(id) !== String(senderID));

      const wantedGender = senderGender === "male" ? "female" : "male";
      const pool = [];

      /* ═══ Check each member's gender ═══ */
      for (const id of realMembers) {
        try {
          let info = null;
          try {
            const ui = await api.getUserInfo(String(id));
            info = ui[String(id)];
          } catch (_) {}
          if (!info || !info.name) continue;

          const g = await detectGender(api, id, info.name);
          if (g === wantedGender) {
            pool.push({ id: String(id), name: info.name });
          }
        } catch (_) { continue; }
      }

      console.log(`[pair] pool (${wantedGender}): ${pool.length}`);

      if (pool.length === 0) {
        react("❌");
        const label = wantedGender === "male" ? "chele" : "meye";
        return api.sendMessage(`❌ Group e kono ${label} pawa gelo na`, threadID);
      }

      /* ═══ Pick random partner ═══ */
      const partner = pool[Math.floor(Math.random() * pool.length)];

      const boy = senderGender === "male"
        ? { id: String(senderID), name: senderInfo.name }
        : partner;
      const girl = senderGender === "female"
        ? { id: String(senderID), name: senderInfo.name }
        : partner;

      /* ═══ Love % ═══ */
      const lovePct = 50 + Math.floor(Math.random() * 51);

      /* ═══ Download images ═══ */
      const [boyPP, girlPP, bgBuf] = await Promise.all([
        getAvatar(boy.id).catch(() => null),
        getAvatar(girl.id).catch(() => null),
        loadPairBackground(config).catch(() => null)
      ]);

      /* ═══ Canvas setup ═══ */
      const W = 1000;
      const H = 480;

      let canvas, ctx;

      if (bgBuf) {
        /* ═══ Use cloud background ═══ */
        const bgImg = await loadImage(bgBuf);
        const aspectImg = bgImg.width / bgImg.height;
        const aspectBox = W / H;

        let bgW = W, bgH = H;
        let offsetX = 0, offsetY = 0;
        if (aspectImg > aspectBox) {
          bgH = H;
          bgW = H * aspectImg;
          offsetX = -(bgW - W) / 2;
        } else {
          bgW = W;
          bgH = W / aspectImg;
          offsetY = -(bgH - H) / 2;
        }

        canvas = createCanvas(W, H);
        ctx = canvas.getContext("2d");
        ctx.drawImage(bgImg, offsetX, offsetY, bgW, bgH);

        /* ═══ Cover the 2 existing PPs in template ═══ */
        /* Left PP — cover with white circle (blend) */
        ctx.save();
        ctx.beginPath();
        ctx.arc(W * 0.646, H * 0.42, W * 0.098, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();

        /* Right PP — cover */
        ctx.save();
        ctx.beginPath();
        ctx.arc(W * 0.935, H * 0.745, W * 0.098, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();

        /* ═══ Add new PPs ═══ */
        await drawPP(ctx, boyPP, W * 0.646, H * 0.42, W * 0.095, "#ffffff", 6);
        await drawPP(ctx, girlPP, W * 0.935, H * 0.745, W * 0.095, "#ffffff", 6);

      } else {
        /* ═══ Fallback — no background ═══ */
        canvas = createCanvas(W, H);
        ctx = canvas.getContext("2d");

        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#ff9a9e");
        grad.addColorStop(0.5, "#fecfef");
        grad.addColorStop(1, "#a18cd1");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 60px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("💕 LOVE MATCH 💕", W / 2, 80);

        await drawPP(ctx, boyPP, W * 0.25, H / 2, 110, "#00ff88", 8);
        await drawPP(ctx, girlPP, W * 0.75, H / 2, 110, "#ff2266", 8);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px sans-serif";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 4;
        ctx.strokeText(`${boy.name.split(" ")[0]} + ${girl.name.split(" ")[0]}`, W / 2, H - 90);
        ctx.fillText(`${boy.name.split(" ")[0]} + ${girl.name.split(" ")[0]}`, W / 2, H - 90);

        ctx.font = "bold 70px sans-serif";
        ctx.fillStyle = "#ff2266";
        ctx.strokeText(`${lovePct}%`, W / 2, H - 20);
        ctx.fillText(`${lovePct}%`, W / 2, H - 20);
      }

      /* ═══ Bottom banner (on top) ═══ */
      const bannerH = 45;
      const bg2 = ctx.createLinearGradient(0, H - bannerH, 0, H);
      bg2.addColorStop(0, "rgba(0,0,0,0)");
      bg2.addColorStop(1, "rgba(0,0,0,0.75)");
      ctx.fillStyle = bg2;
      ctx.fillRect(0, H - bannerH, W, bannerH);

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

      /* ═══ Save + send ═══ */
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
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[pair] error:", e.message);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 80)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1