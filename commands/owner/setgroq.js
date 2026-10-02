// commands/owner/setgroq.js - NEXUS V1 - Set Groq API key
const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
fs.ensureDirSync(DATA_DIR);
const KEY_FILE = path.join(DATA_DIR, "groq_key.txt");

module.exports = {
  name: "setgroq",
  aliases: ["groqkey", "setkey"],
  version: "1.0.0",
  role: 2,
  description: "Groq API key set koro (owner only)",
  usage: "/setgroq <key> | /setgroq show | /setgroq del",
  execute: async function (api, event, args, db, config) {
    const { threadID } = event;

    try {
      const sub = (args[0] || "").toLowerCase();

      /* ═══ show ═══ */
      if (sub === "show" || sub === "status") {
        const has = fs.existsSync(KEY_FILE);
        let masked = "none";
        if (has) {
          const k = fs.readFileSync(KEY_FILE, "utf8").trim();
          masked = k.slice(0, 8) + "..." + k.slice(-4);
        }
        return api.sendMessage(
          `🔑 GROQ API KEY\n` +
          `━━━━━━━━━━━━━━━━━━\n` +
          `📊 Status: ${has ? "SET ✅" : "NOT SET ❌"}\n` +
          `🔐 Key: ${masked}`,
          threadID
        );
      }

      /* ═══ del ═══ */
      if (sub === "del" || sub === "delete" || sub === "remove") {
        if (fs.existsSync(KEY_FILE)) fs.unlinkSync(KEY_FILE);
        return api.sendMessage(`🗑️ Groq key deleted.`, threadID);
      }

      /* ═══ set key ═══ */
      const key = args[0];
      if (!key || !key.startsWith("gsk_")) {
        return api.sendMessage(
          `📝 Usage:\n` +
          `/setgroq gsk_xxxxxxxxxxxxx\n\n` +
          `🔗 Groq key: https://console.groq.com/keys\n\n` +
          `Commands:\n` +
          `/setgroq <key> — set\n` +
          `/setgroq show — status\n` +
          `/setgroq del — delete`,
          threadID
        );
      }

      fs.writeFileSync(KEY_FILE, key.trim());
      return api.sendMessage(
        `✅ Groq API key set!\n` +
        `🔐 ${key.slice(0, 12)}...\n\n` +
        `🤖 AI chat + image gen ekhon ready!`,
        threadID
      );

    } catch (e) {
      api.sendMessage("❌ Error: " + e.message, threadID);
    }
  }
};