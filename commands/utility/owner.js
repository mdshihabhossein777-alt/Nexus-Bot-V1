/**
 * commands/utility/owner.js
 * NEXUS BOT V1 — Owner info with local GIF
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const assets = require("../../utils/assets");

const GIF_NAME = "owner.gif";

/* ═══ Customize korun ═══ */
const OWNER_INFO = {
  name: "Ariyan Shihab",
  nickname: "💮কাঠগোলাপ💮",
  role: "Bot Developer & Owner",
  age: "21+",
  location: "Bangladesh",
  address: "Dhaka, Bangladesh",
  religion: "Islam",
  study: "University student",
  discord: "shihabxyz1",
  botName: "NEXUS BOT V1"
};

module.exports = {
  name: "owner",
  aliases: ["admin", "dev", "creator"],
  version: "4.0.0",
  role: 0,
  description: "Show bot owner information",
  usage: "/owner",
  category: "utility",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    react("⏳");

    let tmpPath = null;

    try {
    const lines = [];
lines.push("╔══════════════════════════╗");
lines.push("   👑  OWNER  INFO  👑");
lines.push("╚══════════════════════════╝");
lines.push("");
lines.push(`👤 Name       : ${OWNER_INFO.name}`);
lines.push(`🌸 Nickname   : ${OWNER_INFO.nickname}`);
lines.push(`🎯 Role       : ${OWNER_INFO.role}`);
lines.push(`🎂 Age        : ${OWNER_INFO.age}`);
lines.push(`📍 Location   : ${OWNER_INFO.location}`);
lines.push(`🏠 Address    : ${OWNER_INFO.address}`);
lines.push(`🕌 Religion   : ${OWNER_INFO.religion}`);
lines.push(`📚 Study      : ${OWNER_INFO.study}`);
lines.push("");
lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━");
lines.push("📞 CONTACT INFO");
lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━");
lines.push("");
if (OWNER_INFO.discord) lines.push(`💬 Discord    : ${OWNER_INFO.discord}`);
lines.push("");
lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━");
lines.push(`💎 ${OWNER_INFO.botName}`);

const body = lines.join("\n");
      /* Load GIF */
      const gifBuf = await assets.loadAsset(GIF_NAME);

      if (gifBuf) {
        tmpPath = path.join(os.tmpdir(), `owner_${Date.now()}.gif`);
        await fs.writeFile(tmpPath, gifBuf);

        api.sendMessage({
          body,
          attachment: fs.createReadStream(tmpPath)
        }, threadID, () => {
          try { fs.unlinkSync(tmpPath); } catch (_) {}
        });
      } else {
        api.sendMessage(body, threadID);
      }

      react("👑");

    } catch (e) {
      console.error("[owner] error:", e.message);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1