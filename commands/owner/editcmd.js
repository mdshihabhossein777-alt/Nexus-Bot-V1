/**
 * commands/owner/editcmd.js
 * NEXUS BOT V1 — Edit existing command file (reply to new code)
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");

module.exports = {
  name: "editcmd",
  aliases: ["editcommand", "replacecmd", "updatecmd"],
  version: "1.0.0",
  role: 2,
  description: "Edit existing command file",
  usage: "/editcmd <path>  (reply to new code)",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, messageReply } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* Owner check */
    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) { react("⛔"); return; }

    /* Help */
    if (!args.length) {
      react("📘");
      return api.sendMessage(
        `✏️ EDIT COMMAND\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 Usage:\n` +
        `1. Send the NEW code as a message\n` +
        `2. Reply to that message\n` +
        `3. Send: /editcmd <path>\n\n` +
        `📌 Examples:\n` +
        `  /editcmd commands/fun/test.js\n` +
        `  /editcmd fun/test.js\n` +
        `  /editcmd test.js\n\n` +
        `⚡ Backup + reload automatic`,
        threadID
      );
    }

    /* Reply check */
    if (!messageReply || !messageReply.body) {
      react("❓");
      return api.sendMessage("❌ Reply to a message containing the new code.", threadID);
    }

    react("⏳");

    try {
      /* Parse path */
      let relPath = args[0].trim().replace(/\\/g, "/");

      if (!relPath.startsWith("commands/")) {
        relPath = "commands/" + relPath;
      }
      if (!relPath.endsWith(".js")) relPath += ".js";

      /* Security */
      if (!relPath.startsWith("commands/") || relPath.includes("..")) {
        react("⛔");
        return api.sendMessage("❌ Invalid path", threadID);
      }

      const fullPath = path.join(__dirname, "..", "..", relPath);

      if (!fs.existsSync(fullPath)) {
        react("❌");
        return api.sendMessage(
          `❌ File not found: ${relPath}\n` +
          `💡 Use /makecmd to create new`,
          threadID
        );
      }

      /* Get new code */
      let code = messageReply.body || "";
      code = code.replace(/^```(?:javascript|js|node)?\n?/i, "").replace(/\n?```$/i, "").trim();

      if (code.length < 20) {
        react("❌");
        return api.sendMessage("❌ Code too short (min 20 chars).", threadID);
      }

      if (!/module\.exports|exports\./i.test(code)) {
        react("⚠️");
        return api.sendMessage("⚠️ Code missing `module.exports`.", threadID);
      }

      /* Backup old file */
      try {
        const backupPath = fullPath + ".bak";
        fs.copyFileSync(fullPath, backupPath);
        console.log(`[editcmd] backup: ${relPath}.bak`);
      } catch (_) {}

      /* Get old command name */
      let oldName = "unknown";
      try {
        const oldContent = fs.readFileSync(fullPath, "utf8");
        const m = oldContent.match(/name\s*:\s*["']([^"']+)["']/);
        if (m) oldName = m[1];
      } catch (_) {}

      /* Write new code */
      await fs.writeFile(fullPath, code, "utf8");
      console.log(`[editcmd] updated: ${relPath} (${code.length} bytes)`);

      /* Get new command name */
      let newName = oldName;
      try {
        const m = code.match(/name\s*:\s*["']([^"']+)["']/);
        if (m) newName = m[1];
      } catch (_) {}

      /* Reload */
      try {
        if (global.NEXUS && typeof global.NEXUS.loadCommands === "function") {
          global.NEXUS.loadCommands();
          console.log("[editcmd] reloaded");
        }
      } catch (e) {
        console.log(`[editcmd] reload fail: ${e.message}`);
      }

      react("✅");
      return api.sendMessage(
        `✅ Command UPDATED\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📁 ${relPath}\n` +
        `🏷️ ${oldName}${oldName !== newName ? " → " + newName : ""}\n` +
        `📊 ${code.length} bytes\n` +
        `💾 Backup: ${relPath}.bak\n` +
        `🔄 Reloaded: yes\n\n` +
        `💡 Test: /${newName}`,
        threadID
      );

    } catch (e) {
      console.error("[editcmd] error:", e.message);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 80)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1