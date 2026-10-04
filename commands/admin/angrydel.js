/**
 * commands/admin/angrydel.js
 * Toggle angry-delete for current group
 */

const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
fs.ensureDirSync(DATA_DIR);
const AD_FILE = path.join(DATA_DIR, "angrydel.json");

function loadAD() {
  try { return fs.readJsonSync(AD_FILE) || {}; } catch (_) { return {}; }
}
function saveAD(d) {
  try { fs.writeJsonSync(AD_FILE, d); } catch (_) {}
}

module.exports = {
  name: "angrydel",
  aliases: ["angerdelete", "angryauto"],
  version: "1.0.0",
  role: 1,
  description: "Auto-delete bot messages when angry emoji reacted",
  usage: "/angrydel on|off|status",
  category: "admin",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;
    const react = (e) => { if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {} };

    /* Admin check */
    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    const isAdmin = isOwner || await db.isAdmin(api, threadID, senderID);

    if (!isAdmin) { react("⛔"); return; }

    const sub = (args[0] || "status").toLowerCase();
    const ad = loadAD();

    if (sub === "on") {
      ad[String(threadID)] = true;
      saveAD(ad);
      react("✅");
      return api.sendMessage("✅ Angry-delete ENABLED", threadID);
    }

    if (sub === "off") {
      ad[String(threadID)] = false;
      saveAD(ad);
      react("✅");
      return api.sendMessage("✅ Angry-delete DISABLED", threadID);
    }

    /* Status */
    react("📊");
    const status = ad[String(threadID)] === true ? "ENABLED ✅" : "DISABLED ❌";
    return api.sendMessage(
      `😡 ANGRY DELETE SYSTEM\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 Status: ${status}\n` +
      `\n💡 Commands:\n` +
      `  /angrydel on\n` +
      `  /angrydel off\n` +
      `\n⚡ Angry emojis: 😡 🤬 😠 💢 👿`,
      threadID
    );
  }
};