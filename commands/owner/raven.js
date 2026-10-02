// commands/owner/raven.js - NEXUS V1 - Toggle Raven mode per group
const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const RAVEN_FILE = path.join(DATA_DIR, "raven.json");

function loadRaven() {
  try { return fs.readJsonSync(RAVEN_FILE) || {}; } catch (_) { return {}; }
}
function saveRaven(d) {
  try { fs.writeJsonSync(RAVEN_FILE, d); } catch (e) { console.error("[raven]", e.message); }
}

module.exports = {
  name: "raven",
  aliases: ["aimode", "chatmode"],
  version: "1.0.0",
  role: 1,
  description: "AI chat + image mode toggle (per group)",
  usage: "/raven on|off | status | imgonly on|off",
  execute: async function (api, event, args, db, config) {
    const { threadID, isGroup } = event;

    try {
      if (!isGroup) return api.sendMessage("⚠️ Group only.", threadID);

      const sub = (args[0] || "").toLowerCase();
      const data = loadRaven();
      const g = data[threadID] || { enabled: false, imgOnly: false };

      if (sub === "status" || sub === "show") {
        return api.sendMessage(
          `🤖 RAVEN MODE\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `💬 Chat: ${g.enabled ? "ON ✅" : "OFF ❌"}\n` +
          `🎨 Image: ${g.imgOnly ? "Only" : "With chat"}\n` +
          `📝 Prefix: none (natural)`,
          threadID
        );
      }

      if (sub === "imgonly") {
        const mode = (args[1] || "").toLowerCase() === "on";
        data[threadID] = { ...g, imgOnly: mode };
        saveRaven(data);
        return api.sendMessage(`🎨 Image-only mode ${mode ? "ON ✅" : "OFF ❌"}`, threadID);
      }

      if (sub === "on" || sub === "off") {
        data[threadID] = { ...g, enabled: (sub === "on") };
        saveRaven(data);
        return api.sendMessage(
          `🤖 Raven mode ${sub === "on" ? "ON ✅" : "OFF ❌"}\n` +
          (sub === "on"
            ? `💡 Sob message e AI reply dibe\n🎨 "img <prompt>" diye image banabe`
            : ""),
          threadID
        );
      }

      api.sendMessage(
        `🤖 RAVEN MODE\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `/raven on | off\n` +
        `/raven status\n` +
        `/raven imgonly on | off\n\n` +
        `💡 Usage:\n` +
        `• Just type anything → AI reply\n` +
        `• Type "img luffy" → image\n` +
        `• Type "generate a cat" → image`,
        threadID
      );

    } catch (e) {
      api.sendMessage("❌ Error: " + e.message, threadID);
    }
  }
};