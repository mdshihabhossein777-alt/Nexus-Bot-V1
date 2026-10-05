/**
 * commands/utility/owner.js
 * NEXUS BOT V1 — Owner info with cloud GIF
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const cloudStorage = require("../../utils/cloudStorage");

/* ═══ Cloud GIF name ═══ */
const GIF_NAME = "owner";

/* ═══ Owner Info — ei gulo customize korun ═══ */
const OWNER_INFO = {
  name: "Ariyan Shihab",
  role: "Bot Developer & Owner",
  location: "Bangladesh",
  facebook: "Ariyan Shihab",
  telegram: "@usershihab",
  discord: "ariyan_shihab",
  whatsapp: "01618155xxx",
  email: "mdshihabhossein777@gmail.com",
  botName: "NEXUS BOT V1"
};

module.exports = {
  name: "owner",
  aliases: ["admin", "dev", "creator"],
  version: "3.0.0",
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
      /* ═══ Build text — NO LINKS ═══ */
      const lines = [];
      lines.push("╔══════════════════════════╗");
      lines.push("   👑  OWNER  INFO  👑");
      lines.push("╚══════════════════════════╝");
      lines.push("");
      lines.push(`👤 Name       : ${OWNER_INFO.name}`);
      lines.push(`🎯 Role       : ${OWNER_INFO.role}`);
      lines.push(`📍 Location   : ${OWNER_INFO.location}`);
      lines.push("");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("📞 CONTACT INFO");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("");
      if (OWNER_INFO.facebook) lines.push(`📘 Facebook  : ${OWNER_INFO.facebook}`);
      if (OWNER_INFO.telegram) lines.push(`✈️ Telegram   : ${OWNER_INFO.telegram}`);
      if (OWNER_INFO.discord)  lines.push(`💬 Discord    : ${OWNER_INFO.discord}`);
      if (OWNER_INFO.whatsapp) lines.push(`📱 WhatsApp   : ${OWNER_INFO.whatsapp}`);
      if (OWNER_INFO.email)    lines.push(`📧 Email      : ${OWNER_INFO.email}`);
      lines.push("");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push(`💎 ${OWNER_INFO.botName}`);

      const body = lines.join("\n");

      /* ═══ Load cloud GIF ═══ */
      let gifBuf = null;
      try {
        const ownerID = String(config.ownerID);
        gifBuf = await cloudStorage.getCloudFileBuffer(ownerID, GIF_NAME, { maxSize: 20 * 1024 * 1024 });
        if (gifBuf) {
          console.log(`[owner] cloud GIF loaded: ${(gifBuf.length / 1024).toFixed(0)} KB`);
        } else {
          console.log(`[owner] cloud GIF not found: ${GIF_NAME}`);
        }
      } catch (e) {
        console.log(`[owner] cloud error: ${e.message.slice(0, 60)}`);
      }

      /* ═══ Send ═══ */
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