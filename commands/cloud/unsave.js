/**
 * commands/cloud/unsave.js
 * NEXUS BOT V1 — Delete cloud file
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const CLOUD_FILE = path.join(DATA_DIR, "cloud.json");

function loadCloud() {
  try { return fs.readJsonSync(CLOUD_FILE) || {}; } catch (_) { return {}; }
}
function saveCloud(d) {
  try { fs.writeJsonSync(CLOUD_FILE, d); } catch (e) { console.error("[cloud]", e.message); }
}

module.exports = {
  name: "unsave",
  aliases: ["delcloud", "removecloud", "clouddel"],
  version: "1.0.0",
  role: 2,
  description: "Delete a cloud file",
  usage: "/unsave <name>",
  category: "cloud",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) { react("⛔"); return; }

    const name = (args[0] || "").trim();
    if (!name) {
      react("❓");
      return api.sendMessage("Usage: /unsave <name>", threadID);
    }

    try {
      const cloud = loadCloud();
      const uid = String(senderID);
      const userCloud = cloud[uid] || {};

      if (!userCloud[name]) {
        react("❌");
        return api.sendMessage(`❌ "${name}" not found`, threadID);
      }

      delete userCloud[name];
      saveCloud(cloud);

      react("🗑️");
      return api.sendMessage(
        `🗑️ Deleted: **${name}**\n\n` +
        `💡 List: /saved`,
        threadID
      );

    } catch (e) {
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1