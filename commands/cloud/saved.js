/**
 * commands/cloud/saved.js
 * NEXUS BOT V1 — List saved cloud files
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const CLOUD_FILE = path.join(DATA_DIR, "cloud.json");

function loadCloud() {
  try { return fs.readJsonSync(CLOUD_FILE) || {}; } catch (_) { return {}; }
}

module.exports = {
  name: "saved",
  aliases: ["cloudlist", "mylist", "storage"],
  version: "1.0.0",
  role: 2,
  description: "List all saved cloud files",
  usage: "/saved",
  category: "cloud",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) { react("⛔"); return; }

    try {
      const cloud = loadCloud();
      const uid = String(senderID);
      const userCloud = cloud[uid] || {};
      const files = Object.values(userCloud);

      if (!files.length) {
        react("📭");
        return api.sendMessage("📭 Cloud empty\n\n💡 Save something: reply image + S", threadID);
      }

      /* Sort by date (newest first) */
      files.sort((a, b) => b.savedAt - a.savedAt);

      const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);

      const lines = [];
      lines.push("☁️ CLOUD STORAGE");
      lines.push("━━━━━━━━━━━━━━━━━━━━");
      lines.push(`📊 Files: ${files.length}`);
      lines.push(`💾 Total: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      lines.push("");

      files.slice(0, 30).forEach((f, i) => {
        const icon = {
          image: "🖼️", gif: "🎞️", video: "🎬", audio: "🎵", file: "📄"
        }[f.type] || "📄";
        lines.push(`${i + 1}. ${icon} **${f.name}** — ${(f.size / 1024).toFixed(0)} KB`);
      });

      if (files.length > 30) {
        lines.push(`\n... and ${files.length - 30} more`);
      }

      lines.push("");
      lines.push("💡 Get: /get <name>");
      lines.push("💡 Delete: /unsave <name>");

      react("📋");
      return api.sendMessage(lines.join("\n"), threadID);

    } catch (e) {
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1