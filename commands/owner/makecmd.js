/**
 * commands/owner/makecmd.js
 * NEXUS BOT V1 — Create command file + auto-push to GitHub
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const githubPush = require("../../utils/githubPush");

module.exports = {
  name: "makecmd",
  aliases: ["createcmd", "newcmd", "addcmd"],
  version: "3.0.0",
  role: 2,
  description: "Create command file + push to GitHub",
  usage: "/makecmd <path>  (reply to code message)",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, messageReply } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* Owner check */
    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) { react("⛔"); return; }

    /* Help */
    if (!args.length) {
      react("📘");
      const ghStatus = githubPush.isConfigured() ? "✅ Enabled" : "❌ Not configured";
      return api.sendMessage(
        `🛠️ AUTO COMMAND CREATOR\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 How to use:\n` +
        `1. Send code as a message to bot\n` +
        `2. Reply to that message\n` +
        `3. Send: /makecmd <path>\n\n` +
        `📌 Path Examples:\n` +
        `  /makecmd commands/fun/test.js\n` +
        `  /makecmd fun/test.js\n\n` +
        `🌐 GitHub Push: ${ghStatus}\n` +
        `⚡ Auto-reload: enabled`,
        threadID
      );
    }

    /* Reply check */
    if (!messageReply || !messageReply.body) {
      react("❓");
      return api.sendMessage("❌ Reply to a message containing the code.", threadID);
    }

    react("⏳");

    try {
      /* Parse path */
      let relPath = args[0].trim().replace(/\\/g, "/");
      if (!relPath.startsWith("commands/")) relPath = "commands/" + relPath;
      if (!relPath.endsWith(".js")) relPath += ".js";

      /* Security */
      if (!relPath.startsWith("commands/") || relPath.includes("..")) {
        react("⛔");
        return api.sendMessage("❌ Invalid path", threadID);
      }

      /* Get code */
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

      /* Write file locally */
      const fullPath = path.join(__dirname, "..", "..", relPath);
      fs.ensureDirSync(path.dirname(fullPath));
      const existed = fs.existsSync(fullPath);
      await fs.writeFile(fullPath, code, "utf8");

      console.log(`[makecmd] ${existed ? "updated" : "created"}: ${relPath} (${code.length} bytes)`);

      /* Push to GitHub */
      let gitResult = { success: false, reason: "not attempted" };
      try {
        gitResult = await githubPush.pushFile(
          relPath,
          code,
          `[makecmd] ${existed ? "Update" : "Add"} ${relPath}`
        );
        console.log(`[makecmd] GitHub push: ${gitResult.success ? "✅" : "❌ " + gitResult.reason}`);
      } catch (e) {
        gitResult = { success: false, reason: e.message };
        console.log(`[makecmd] GitHub push error: ${e.message}`);
      }

      /* Reload commands */
      try {
        if (global.NEXUS && typeof global.NEXUS.loadCommands === "function") {
          global.NEXUS.loadCommands();
          console.log("[makecmd] reloaded");
        }
      } catch (e) {
        console.log(`[makecmd] reload fail: ${e.message}`);
      }

      /* Get command name */
      let cmdName = "unknown";
      const m = code.match(/name\s*:\s*["']([^"']+)["']/);
      if (m) cmdName = m[1];

      react("✅");

      const ghLine = gitResult.success
        ? `🌐 GitHub: ✅ ${gitResult.action}`
        : `🌐 GitHub: ❌ ${(gitResult.reason || "").slice(0, 40)}`;

      return api.sendMessage(
        `✅ Command ${existed ? "UPDATED" : "CREATED"}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📁 ${relPath}\n` +
        `🏷️ ${cmdName}\n` +
        `📊 ${code.length} bytes\n` +
        `${ghLine}\n` +
        `🔄 Reloaded: yes\n` +
        `💡 Test: /${cmdName}`,
        threadID
      );

    } catch (e) {
      console.error("[makecmd] error:", e.message);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 80)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1
