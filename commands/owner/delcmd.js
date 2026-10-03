/**
 * commands/owner/delcmd.js
 * NEXUS BOT V1 — Delete command file
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");

module.exports = {
  name: "delcmd",
  aliases: ["deletecmd", "removecmd", "rmcmd"],
  version: "1.0.0",
  role: 2,
  description: "Delete a command file",
  usage: "/delcmd <path>",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Owner check ═══ */
    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) {
      react("⛔");
      return;
    }

    /* ═══ Help ═══ */
    if (!args.length) {
      react("📘");
      return api.sendMessage(
        `🗑️ DELETE COMMAND\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 Usage: /delcmd <path>\n` +
        `\n` +
        `📌 Examples:\n` +
        `  /delcmd commands/fun/test.js\n` +
        `  /delcmd fun/test.js\n` +
        `  /delcmd test.js\n` +
        `\n` +
        `⚠️ File permanently deleted`,
        threadID
      );
    }

    try {
      /* ═══ Parse path ═══ */
      let inputPath = args[0].trim();
      let relPath = inputPath.replace(/\\/g, "/");

      /* Auto prepend commands/ */
      if (!relPath.startsWith("commands/")) {
        relPath = "commands/" + relPath;
      }

      /* Ensure .js extension */
      if (!relPath.endsWith(".js")) relPath += ".js";

      /* Security check */
      if (!relPath.startsWith("commands/")) {
        react("⛔");
        return api.sendMessage("❌ Only commands/ folder allowed", threadID);
      }
      if (relPath.includes("..")) {
        react("⛔");
        return api.sendMessage("❌ Invalid path", threadID);
      }

      /* ═══ Full path ═══ */
      const fullPath = path.join(__dirname, "..", "..", relPath);

      /* ═══ Check exists ═══ */
      if (!fs.existsSync(fullPath)) {
        react("❌");
        return api.sendMessage(
          `❌ File not found: ${relPath}`,
          threadID
        );
      }

      react("⏳");

      /* ═══ Read command name before deletion ═══ */
      let cmdName = "unknown";
      try {
        const content = fs.readFileSync(fullPath, "utf8");
        const nameMatch = content.match(/name\s*:\s*["']([^"']+)["']/);
        if (nameMatch) cmdName = nameMatch[1];
      } catch (_) {}

      /* ═══ Delete file ═══ */
      fs.unlinkSync(fullPath);
      console.log(`[delcmd] deleted: ${relPath}`);

      /* ═══ Reload commands ═══ */
      try {
        if (global.NEXUS && typeof global.NEXUS.loadCommands === "function") {
          global.NEXUS.loadCommands();
          console.log("[delcmd] commands reloaded");
        }
      } catch (e) {
        console.log(`[delcmd] reload fail: ${e.message}`);
      }

      react("✅");
      return api.sendMessage(
        `✅ Command DELETED\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📁 File: ${relPath}\n` +
        `🏷️ Name: ${cmdName}\n` +
        `🔄 Reloaded: yes`,
        threadID
      );

    } catch (e) {
      console.error("[delcmd] error:", e.message);
      react("❌");
      api.sendMessage(`❌ Failed: ${e.message.slice(0, 80)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1