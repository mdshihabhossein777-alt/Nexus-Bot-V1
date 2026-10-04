/**
 * commands/owner/blacklist.js
 * NEXUS BOT V1 — Blacklist a user from using bot
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const BL_FILE = path.join(DATA_DIR, "blacklist.json");

function loadBL() {
  try { return fs.readJsonSync(BL_FILE) || {}; } catch (_) { return {}; }
}
function saveBL(d) {
  try { fs.writeJsonSync(BL_FILE, d); } catch (_) {}
}

module.exports = {
  name: "blacklist",
  aliases: ["bl", "block", "banuser"],
  version: "1.0.0",
  role: 2,
  description: "Blacklist a user (can't use bot commands)",
  usage: "/blacklist @user [reason]",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Owner check ═══ */
    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) { react("⛔"); return; }

    /* ═══ Help ═══ */
    if (!mentions && !messageReply && !args.length) {
      const bl = loadBL();
      const list = Object.keys(bl);

      if (!list.length) {
        react("📋");
        return api.sendMessage(
          "🚫 BLACKLIST SYSTEM\n" +
          "━━━━━━━━━━━━━━━━━━━━\n" +
          "📝 Usage:\n" +
          "  /blacklist @user [reason]\n" +
          "  /blacklist (reply to user)\n\n" +
          "📊 Current: 0 users blacklisted",
          threadID
        );
      }

      let text = "🚫 BLACKLISTED USERS\n━━━━━━━━━━━━━━━━━━━━\n";
      let i = 1;
      for (const uid of list.slice(0, 20)) {
        let name = uid;
        try {
          const ui = await api.getUserInfo(uid);
          if (ui && ui[uid] && ui[uid].name) name = ui[uid].name;
        } catch (_) {}
        text += `${i}. ${name}\n   📝 ${bl[uid].reason || "no reason"}\n`;
        i++;
      }
      text += `\n📊 Total: ${list.length}`;
      react("📋");
      return api.sendMessage(text, threadID);
    }

    /* ═══ Determine target ═══ */
    let targetID = null;
    let reason = "Not specified";

    if (mentions && Object.keys(mentions).length) {
      targetID = String(Object.keys(mentions)[0]);
      const reasonArgs = args.filter((a) => !a.startsWith("@"));
      if (reasonArgs.length) reason = reasonArgs.join(" ");
    } else if (messageReply && messageReply.senderID) {
      targetID = String(messageReply.senderID);
      if (args.length) reason = args.join(" ");
    }

    if (!targetID) {
      react("❓");
      return api.sendMessage("Mention or reply to a user", threadID);
    }

    if (targetID === String(config.ownerID)) {
      react("❌");
      return api.sendMessage("❌ Can't blacklist the owner", threadID);
    }

    /* ═══ Get name ═══ */
    let name = targetID;
    try {
      const ui = await api.getUserInfo(targetID);
      if (ui && ui[targetID] && ui[targetID].name) name = ui[targetID].name;
    } catch (_) {}

    /* ═══ Save to blacklist ═══ */
    const bl = loadBL();
    bl[targetID] = {
      name,
      reason,
      by: String(senderID),
      time: Date.now()
    };
    saveBL(bl);

    console.log(`[blacklist] added: ${name} (${targetID}) reason: ${reason}`);

    react("🚫");
    return api.sendMessage(
      "🚫 BLACKLISTED\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      `👤 ${name}\n` +
      `📝 Reason: ${reason}\n` +
      `⚠️ This user can't use bot commands`,
      threadID,
      { mentions: [{ tag: name, id: targetID }] }
    );
  }
};

// © 2026 NEXUS BOT V1