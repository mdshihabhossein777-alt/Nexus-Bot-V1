/**
 * commands/owner/unloadcmd.js
 * NEXUS BOT V1 — Unload a command from memory
 * © 2026
 */

const path = require("path");

module.exports = {
  name: "unloadcmd",
  aliases: ["unload", "unloadcommand", "disable"],
  version: "1.0.0",
  role: 2,
  description: "Unload a command from memory",
  usage: "/unloadcmd <name>",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) { react("⛔"); return; }

    const name = (args[0] || "").toLowerCase().trim();
    if (!name) {
      react("❓");
      return api.sendMessage("📝 Usage: /unloadcmd <name>", threadID);
    }

    const commands = global.NEXUS && global.NEXUS.commands;
    if (!commands) {
      react("❌");
      return api.sendMessage("❌ Commands map not available", threadID);
    }

    const cmd = commands.get(name);
    if (!cmd) {
      react("❌");
      return api.sendMessage(`❌ Command "${name}" not found`, threadID);
    }

    /* Don't allow unloading critical commands */
    const protectedCmds = ["makecmd", "delcmd", "editcmd", "loadcmd", "unloadcmd", "deploy"];
    if (protectedCmds.includes(cmd.name)) {
      react("⛔");
      return api.sendMessage(`❌ Can't unload protected command: ${cmd.name}`, threadID);
    }

    react("⏳");

    try {
      /* ═══ Remove from map (all aliases) ═══ */
      const mainName = String(cmd.name).toLowerCase();
      commands.delete(mainName);
      (cmd.aliases || []).forEach((a) => commands.delete(String(a).toLowerCase()));

      /* ═══ Try to clear require cache if file path known ═══ */
      try {
        const possiblePaths = [
          path.join(__dirname, "..", "..", "commands", cmd.category || "", cmd.name + ".js"),
          path.join(__dirname, "..", "..", "commands", cmd.name + ".js")
        ];
        for (const p of possiblePaths) {
          if (require.cache[require.resolve(p)]) {
            delete require.cache[require.resolve(p)];
          }
        }
      } catch (_) {}

      react("✅");
      return api.sendMessage(
        `✅ Command UNLOADED\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🏷️ ${cmd.name}\n` +
        `⚠️ Removed from memory (file still on disk)\n` +
        `💡 Reload: /loadcmd commands/${cmd.category || ""}/${cmd.name}.js`,
        threadID
      );

    } catch (e) {
      console.error("[unloadcmd] error:", e.message);
      react("❌");
      return api.sendMessage(`❌ ${e.message.slice(0, 100)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1