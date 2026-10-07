/**
 * commands/owner/nexus.js
 * NEXUS BOT V1 — Owner-only JavaScript Executor
 * © 2026
 */

"use strict";

const util = require("util");

module.exports = {
  name: "nexus",
  aliases: ["eval", "run", "exec", "js", "code"],
  version: "1.0.0",
  role: 2,                         /* ⚡ Owner only */
  description: "Execute JavaScript (owner only)",
  usage: "/nexus <code>  OR  reply + /nexus",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, body, messageReply } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Owner-only check ═══ */
    const isOwner = String(senderID) === String(config.ownerID);
    if (!isOwner) { react("⛔"); return; }

    /* ═══ Extract code ═══ */
    let code = args.join(" ").trim();

    /* If no args → try from reply */
    if (!code && messageReply && messageReply.body) {
      code = String(messageReply.body).trim();
    }

    /* Strip command name from body */
    if (!code && body) {
      const prefix = config.prefix || "/";
      let raw = body.trim();
      if (raw.startsWith(prefix)) raw = raw.slice(prefix.length).trim();
      raw = raw.replace(/^nexus\s+/i, "").trim();
      if (raw) code = raw;
    }

    if (!code) {
      react("❓");
      return api.sendMessage(
        "🖥️ NEXUS JS EXECUTOR\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "📝 Usage:\n" +
        "  /nexus <code>\n" +
        "  (reply to code) /nexus\n\n" +
        "💡 Examples:\n" +
        "  /nexus 2 + 2\n" +
        "  /nexus api.getCurrentUserID()\n" +
        "  /nexus await api.setMessageReaction(\"😊\", event.messageID, event.threadID, () => {})",
        threadID
      );
    }

    react("⏳");

    /* ═══ Build async context ═══ */
    const bot = (global.NEXUS && global.NEXUS.api) ? global.NEXUS.api : api;
    const commands = (global.NEXUS && global.NEXUS.commands) || new Map();

    try {
      /* ═══ Async wrapper — all vars in scope ═══ */
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

      const fn = new AsyncFunction(
        "api", "event", "db", "config", "commands", "bot",
        "threadID", "senderID", "messageID",
        `"use strict";\nreturn (async () => { ${code} })();`
      );

      let result = await fn(
        api, event, db, config, commands, bot,
        threadID, senderID, messageID
      );

      /* ═══ Format output ═══ */
      let output;
      if (result === undefined) output = "(undefined)";
      else if (result === null) output = "(null)";
      else if (typeof result === "string") output = result;
      else output = util.inspect(result, { depth: 2, colors: false });

      if (output.length > 2000) output = output.slice(0, 1997) + "...";

      react("✅");
      return api.sendMessage(
        `✅ **RESULT**\n\`\`\`js\n${output}\n\`\`\``,
        threadID
      );

    } catch (e) {
      react("❌");
      const errMsg = (e && e.stack) ? e.stack.slice(0, 500) : String(e);
      return api.sendMessage(
        `❌ **ERROR**\n\`\`\`\n${errMsg}\n\`\`\``,
        threadID
      );
    }
  }
};

// © 2026 NEXUS BOT V1