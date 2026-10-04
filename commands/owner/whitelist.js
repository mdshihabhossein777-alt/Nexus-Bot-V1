/**
 * commands/owner/whitelist.js
 * NEXUS BOT V1 — Whitelist a user (remove from blacklist)
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
  name: "whitelist",
  aliases: ["wl", "unblock", "unbanuser"],
  version: "1.0.0",
  role: 2,
  description: "Remove user from blacklist",
  usage: "/whitelist @user",
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
    if (!mentions && !messageReply) {
      react("📘");
      return api.sendMessage(
        "✅ WHITELIST SYSTEM\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "📝 Usage:\n" +
        "  /whitelist @user\n" +
        "  /whitelist (reply to user)\n\n" +
        "💡 Removes user from blacklist",
        threadID
      );
    }

    /* ═══ Determine target ═══ */
    let targetID = null;
    if (mentions && Object.keys(mentions).length) {
      targetID = String(Object.keys(mentions)[0]);
    } else if (messageReply && messageReply.senderID) {
      targetID = String(messageReply.senderID);
    }

    if (!targetID) {
      react("❓");
      return api.sendMessage("Mention or reply to a user", threadID);
    }

    /* ═══ Check if blacklisted ═══ */
    const bl = loadBL();
    if (!bl[targetID]) {
      react("❌");
      return api.sendMessage("❌ This user is not blacklisted", threadID);
    }

    const name = bl[targetID].name || targetID;

    /* ═══ Remove ═══ */
    delete bl[targetID];
    saveBL(bl);

    console.log(`[whitelist] removed: ${name} (${targetID})`);

    react("✅");
    return api.sendMessage(
      "✅ WHITELISTED\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      `👤 ${name}\n` +
      `🔓 Can use bot commands again`,
      threadID,
      { mentions: [{ tag: name, id: targetID }] }
    );
  }
};

// © 2026 NEXUS BOT V1