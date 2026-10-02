// commands/ai/autoreply.js - NEXUS V1 - AI Auto-Reply Toggle
const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
fs.ensureDirSync(DATA_DIR);
const AR_FILE = path.join(DATA_DIR, "autoreply.json");

function loadAR() {
  try { return fs.readJsonSync(AR_FILE) || {}; } catch (_) { return {}; }
}
function saveAR(d) {
  try { fs.writeJsonSync(AR_FILE, d); } catch (e) { console.error("[autoreply]", e.message); }
}

module.exports = {
  name: "autoreply",
  aliases: ["ar", "autochat", "autogpt"],
  version: "2.0.0",
  role: 1,
  description: "Toggle AI auto-reply for questions",
  usage: "/autoreply on|off | status | blacklist @user | unblacklist @user",
  execute: async function (api, event, args, db, config) {
    const { threadID, mentions } = event;

    try {
      const sub = (args[0] || "").toLowerCase();
      const data = loadAR();
      const g = data[threadID] || {};

      /* ═══ status ═══ */
      if (sub === "status" || sub === "show") {
        const enabled = g.enabled !== false;
        const blacklist = g.blacklist || [];
        return api.sendMessage(
          `🤖 AI AUTO-REPLY\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `📊 Status: ${enabled ? "ON ✅" : "OFF ❌"}\n` +
          `🚫 Blacklist: ${blacklist.length} user(s)`,
          threadID
        );
      }

      /* ═══ on/off ═══ */
      if (sub === "on" || sub === "off") {
        if (!data[threadID]) data[threadID] = {};
        data[threadID].enabled = (sub === "on");
        saveAR(data);
        return api.sendMessage(
          `🤖 AI Auto-Reply ${sub === "on" ? "ON ✅" : "OFF ❌"}`,
          threadID
        );
      }

      /* ═══ blacklist @user ═══ */
      if (sub === "blacklist" || sub === "bl") {
        const ids = Object.keys(mentions || {});
        if (!ids.length) return api.sendMessage("📝 /autoreply blacklist @user", threadID);

        if (!data[threadID]) data[threadID] = {};
        if (!data[threadID].blacklist) data[threadID].blacklist = [];

        const target = String(ids[0]);
        if (!data[threadID].blacklist.includes(target)) {
          data[threadID].blacklist.push(target);
          saveAR(data);
        }
        return api.sendMessage(`✅ <@${target}> blacklisted.`, threadID);
      }

      /* ═══ unblacklist @user ═══ */
      if (sub === "unblacklist" || sub === "unbl") {
        const ids = Object.keys(mentions || {});
        if (!ids.length) return api.sendMessage("📝 /autoreply unblacklist @user", threadID);

        if (!data[threadID]) data[threadID] = {};
        if (!data[threadID].blacklist) data[threadID].blacklist = [];

        const target = String(ids[0]);
        data[threadID].blacklist = data[threadID].blacklist.filter((x) => String(x) !== target);
        saveAR(data);
        return api.sendMessage(`✅ <@${target}> removed from blacklist.`, threadID);
      }

      /* ═══ help ═══ */
      api.sendMessage(
        `🤖 AI AUTO-REPLY\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `/autoreply on | off\n` +
        `/autoreply status\n` +
        `/autoreply blacklist @user\n` +
        `/autoreply unblacklist @user`,
        threadID
      );

    } catch (e) {
      api.sendMessage("❌ Error: " + e.message, threadID);
    }
  }
};