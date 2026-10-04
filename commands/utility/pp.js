/**
 * commands/utility/pp.js
 * NEXUS BOT V1 — Get user's Facebook profile picture
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══ Download FB profile picture ═══ */
async function getAvatar(uid) {
  const urls = [
    `https://graph.facebook.com/${uid}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
    `https://graph.facebook.com/${uid}/picture?type=large&width=720&height=720`,
    `https://graph.facebook.com/${uid}/picture?width=720&height=720`
  ];
  for (const url of urls) {
    try {
      const r = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 15000,
        maxRedirects: 5,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const buf = Buffer.from(r.data);
      if (buf.length > 1000) return buf;
    } catch (_) { continue; }
  }
  return null;
}

module.exports = {
  name: "pp",
  aliases: ["profile", "pfp", "avatar", "dp"],
  version: "1.0.0",
  role: 0,
  description: "Get user's profile picture",
  usage: "/pp @user",
  category: "utility",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    react("⏳");

    let tmp = null;

    try {
      /* ═══ Determine target user ═══ */
      let targetID = String(senderID);

      if (mentions && Object.keys(mentions).length) {
        targetID = String(Object.keys(mentions)[0]);
      } else if (messageReply && messageReply.senderID) {
        targetID = String(messageReply.senderID);
      }

      /* ═══ Get user name ═══ */
      let name = "User";
      try {
        const ui = await api.getUserInfo(targetID);
        if (ui && ui[targetID] && ui[targetID].name) {
          name = ui[targetID].name;
        }
      } catch (_) {}

      /* ═══ Download avatar ═══ */
      const avatarBuf = await getAvatar(targetID);
      if (!avatarBuf) {
        react("❌");
        return api.sendMessage("❌ Could not fetch profile picture", threadID);
      }

      /* ═══ Detect format ═══ */
      let ext = "jpg";
      if (avatarBuf[0] === 0x89 && avatarBuf[1] === 0x50) ext = "png";

      /* ═══ Save + send ═══ */
      tmp = path.join(os.tmpdir(), `pp_${Date.now()}.${ext}`);
      await fs.writeFile(tmp, avatarBuf);

      react("✅");
      api.sendMessage({
        body: `👤 ${name}`,
        mentions: [{ tag: name, id: targetID }],
        attachment: fs.createReadStream(tmp)
      }, threadID, () => {
        try { fs.unlinkSync(tmp); } catch (_) {}
      });

    } catch (e) {
      console.error("[pp] error:", e.message);
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1