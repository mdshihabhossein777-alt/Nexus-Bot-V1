/**
 * commands/cloud/get.js
 * NEXUS BOT V1 — Retrieve file from cloud
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const CLOUD_FILE = path.join(DATA_DIR, "cloud.json");

function loadCloud() {
  try { return fs.readJsonSync(CLOUD_FILE) || {}; } catch (_) { return {}; }
}

module.exports = {
  name: "get",
  aliases: ["fetch", "retrieve"],
  version: "1.0.0",
  role: 2,
  description: "Retrieve file from cloud",
  usage: "/get <name>",
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
      return api.sendMessage("Usage: /get <name>", threadID);
    }

    react("⏳");

    try {
      const cloud = loadCloud();
      const uid = String(senderID);
      const userCloud = cloud[uid] || {};

      const file = userCloud[name];
      if (!file) {
        react("❌");
        return api.sendMessage(`❌ "${name}" not found in cloud.\n💡 Check: /saved`, threadID);
      }

      /* ═══ Download from cloud ═══ */
      const dl = await axios.get(file.url, {
        responseType: "arraybuffer",
        timeout: 120000,
        maxContentLength: 250 * 1024 * 1024,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const buf = Buffer.from(dl.data);
      const tmp = path.join(os.tmpdir(), `get_${name}_${Date.now()}.${file.ext || "bin"}`);
      await fs.writeFile(tmp, buf);

      react("📤");
      api.sendMessage({
        body: `☁️ ${name} (${(buf.length / 1024).toFixed(1)} KB)`,
        attachment: fs.createReadStream(tmp)
      }, threadID, () => {
        try { fs.unlinkSync(tmp); } catch (_) {}
      });

    } catch (e) {
      console.error("[cloud/get] error:", e.message);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1