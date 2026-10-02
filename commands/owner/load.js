// commands/owner/load.js - NEXUS V1 - Load/reload a single command file
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  name: "load",
  aliases: ["lc", "loadcmd"],
  version: "1.0.0",
  role: 2,
  description: "OWNER: Reload a specific command file",
  usage: "/load <category/filename>  e.g.  /load fun/slap.js",
  execute: async function (api, event, args, db, config) {
    const { threadID } = event;
    try {
      if (!args.length) {
        return api.sendMessage(
          `📝 USAGE:\n` +
          `/load <filename>\n\n` +
          `Examples:\n` +
          `/load fun/slap.js\n` +
          `/load admin/kick.js\n` +
          `/load economy/top.js\n` +
          `/load autodl.js\n\n` +
          `💡 Or just /load slap (auto-find in categories)`,
          threadID
        );
      }

      const NEXUS = global.NEXUS;
      if (!NEXUS) return api.sendMessage("❌ Global not ready.", threadID);

      const COMMANDS_DIR = path.join(__dirname, "..", "..", "commands");
      let filename = args.join(" ").trim();

      /* Add .js if missing */
      if (!filename.endsWith(".js")) filename += ".js";

      /* Possible paths */
      const candidates = [
        path.join(COMMANDS_DIR, filename),                      // e.g. fun/slap.js
        path.join(COMMANDS_DIR, args[0] + ".js"),               // e.g. slap.js (root)
      ];

      /* Search all categories */
      const cats = ["admin", "ai", "economy", "fun", "utility", "download", "owner", "games"];
      for (const c of cats) {
        candidates.push(path.join(COMMANDS_DIR, c, filename));
        candidates.push(path.join(COMMANDS_DIR, c, args[0] + ".js"));
      }

      /* Find first existing */
      let full = null;
      for (const p of candidates) {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          full = p;
          break;
        }
      }

      if (!full) {
        return api.sendMessage(`❌ File not found: ${filename}`, threadID);
      }

      /* Clear require cache */
      try {
        delete require.cache[require.resolve(full)];
      } catch (_) {}

      /* Load it */
      const cmd = require(full);
      if (!cmd || !cmd.name || typeof cmd.execute !== "function") {
        return api.sendMessage(`❌ Invalid command file (missing name/execute)`, threadID);
      }

      /* Register in commands Map */
      const category = path.basename(path.dirname(full));
      cmd.category = (category === "commands") ? "uncategorized" : category;

      const key = String(cmd.name).toLowerCase();
      NEXUS.commands.set(key, cmd);
      (cmd.aliases || []).forEach((a) => NEXUS.commands.set(String(a).toLowerCase(), cmd));

      /* Rebuild link triggers */
      if (cmd.autoDownload && Array.isArray(cmd.patterns)) {
        /* Remove old triggers for this command */
        for (let i = NEXUS.linkTriggers.length - 1; i >= 0; i--) {
          if (NEXUS.linkTriggers[i].command.name === cmd.name) {
            NEXUS.linkTriggers.splice(i, 1);
          }
        }
        /* Add new ones */
        for (const p of cmd.patterns) {
          try {
            NEXUS.linkTriggers.push({
              pattern: p instanceof RegExp ? p : new RegExp(p, "i"),
              command: cmd
            });
          } catch (_) {}
        }
      }

      const rel = path.relative(COMMANDS_DIR, full);
      api.sendMessage(
        `✅ LOADED\n` +
        `────────────\n` +
        `📄 File: ${rel}\n` +
        `🎯 Command: ${cmd.name}\n` +
        `🔑 Aliases: ${(cmd.aliases || []).join(", ") || "(none)"}\n` +
        `📦 Role: ${cmd.role}`,
        threadID
      );

    } catch (e) {
      api.sendMessage("❌ Load failed: " + e.message, threadID);
    }
  }
};
// Powered by Shihab