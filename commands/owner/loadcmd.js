/**
 * commands/owner/loadcmd.js
 * NEXUS BOT V1 — Load a command file at runtime
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");

module.exports = {
  name: "loadcmd",
  aliases: ["load", "loadcommand"],
  version: "1.0.0",
  role: 2,
  description: "Load a command file into memory",
  usage: "/loadcmd <path>",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) { react("⛔"); return; }

    if (!args.length) {
      react("❓");
      return api.sendMessage(
        "📝 Usage: /loadcmd <path>\n" +
        "Example: /loadcmd commands/fun/hello.js",
        threadID
      );
    }

    let relPath = args[0].trim().replace(/\\/g, "/");
    if (!relPath.startsWith("commands/")) relPath = "commands/" + relPath;
    if (!relPath.endsWith(".js")) relPath += ".js";

    if (!relPath.startsWith("commands/") || relPath.includes("..")) {
      react("⛔");
      return api.sendMessage("❌ Invalid path", threadID);
    }

    const fullPath = path.join(__dirname, "..", "..", relPath);

    if (!fs.existsSync(fullPath)) {
      react("❌");
      return api.sendMessage(`❌ File not found: ${relPath}`, threadID);
    }

    react("⏳");

    try {
      /* ═══ Clear cache + require ═══ */
      delete require.cache[require.resolve(fullPath)];
      const cmd = require(fullPath);

      if (!cmd || !cmd.name || typeof cmd.execute !== "function") {
        react("❌");
        return api.sendMessage("❌ Invalid command file (missing name/execute)", threadID);
      }

      /* ═══ Add to commands map ═══ */
      const commands = global.NEXUS && global.NEXUS.commands;
      if (!commands) throw new Error("commands map not available");

      const key = String(cmd.name).toLowerCase();
      commands.set(key, cmd);
      (cmd.aliases || []).forEach((a) => commands.set(String(a).toLowerCase(), cmd));

      react("✅");
      return api.sendMessage(
        `✅ Command LOADED\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📁 ${relPath}\n` +
        `🏷️ ${cmd.name}\n` +
        `💡 Test: /${cmd.name}`,
        threadID
      );

    } catch (e) {
      console.error("[loadcmd] error:", e.message);
      react("❌");
      return api.sendMessage(`❌ ${e.message.slice(0, 100)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1