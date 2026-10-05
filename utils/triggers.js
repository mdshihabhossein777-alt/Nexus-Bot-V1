/**
 * utils/triggers.js
 * NEXUS BOT V1 — Universal trigger registry
 * 
 * Commands can register their own triggers here — NO index.js changes needed!
 * 
 * Usage in any command file:
 *   module.exports = {
 *     name: "mycommand",
 *     triggers: {
 *       reply: ["sc", "screenshot"],      // reply to message with these words
 *       text: ["hello", "hi"],             // message starts with these
 *       react: ["😡", "🤬"],               // emojis
 *       regex: [/^!x\s+/i]                 // custom regex
 *     },
 *     execute: ...
 *   }
 */

"use strict";

/**
 * Check all loaded commands for trigger matches.
 * Called from index.js ONE TIME at startup.
 * 
 * @returns { handled: boolean, command: object }
 */
async function checkTriggers(api, event, db, config, commands, body, senderID) {
  const trimmed = (body || "").trim();
  if (!trimmed) return false;

  /* ═══ 1. REACTION TRIGGERS — event.type === "message_reaction" ═══ */
  if (event.type === "message_reaction") {
    const reaction = event.reaction || "";
    if (!reaction) return false;

    for (const [key, cmd] of commands) {
      if (!cmd.triggers || !cmd.triggers.react) continue;
      if (!Array.isArray(cmd.triggers.react)) continue;
      if (cmd.triggers.react.includes(reaction)) {
        try {
          if (typeof cmd.handleReaction === "function") {
            await cmd.handleReaction(api, event, db, config);
            return true;
          } else if (typeof cmd.execute === "function") {
            await cmd.execute(api, event, [], db, config, { prefix: config.prefix, commands });
            return true;
          }
        } catch (e) {
          console.log(`[trigger-react] ${cmd.name}: ${e.message}`);
        }
        return true;
      }
    }
    return false;
  }

  /* ═══ 2. REPLY TRIGGERS — user replied to a message ═══ */
  if (event.messageReply && event.messageReply.messageID) {
    const lower = trimmed.toLowerCase();

    for (const [key, cmd] of commands) {
      if (!cmd.triggers || !cmd.triggers.reply) continue;
      if (!Array.isArray(cmd.triggers.reply)) continue;

      /* Check if message matches ANY reply trigger (exact word or starts with) */
      const matched = cmd.triggers.reply.some((t) => {
        const lt = String(t).toLowerCase();
        return lower === lt || lower.startsWith(lt + " ");
      });

      if (matched) {
        try {
          if (typeof cmd.handleReply === "function") {
            const handled = await cmd.handleReply(api, event, event.messageID, event.threadID, senderID, body);
            if (handled) return true;
          } else if (typeof cmd.execute === "function") {
            const args = trimmed.split(/\s+/).slice(1);
            await cmd.execute(api, event, args, db, config, { prefix: config.prefix, commands });
            return true;
          }
        } catch (e) {
          console.log(`[trigger-reply] ${cmd.name}: ${e.message}`);
        }
        return true;
      }
    }
  }

  /* ═══ 3. TEXT/WORD TRIGGERS — no prefix needed ═══ */
  /* Skip if message starts with prefix (that's a normal command) */
  if (!trimmed.startsWith(config.prefix)) {
    const lower = trimmed.toLowerCase();

    for (const [key, cmd] of commands) {
      if (!cmd.triggers || !cmd.triggers.text) continue;
      if (!Array.isArray(cmd.triggers.text)) continue;

      const matched = cmd.triggers.text.some((t) => {
        const lt = String(t).toLowerCase();
        return lower === lt || lower.startsWith(lt + " ");
      });

      if (matched) {
        try {
          const args = trimmed.split(/\s+/).slice(1);
          await cmd.execute(api, event, args, db, config, { prefix: config.prefix, commands });
          return true;
        } catch (e) {
          console.log(`[trigger-text] ${cmd.name}: ${e.message}`);
        }
        return true;
      }
    }
  }

  /* ═══ 4. REGEX TRIGGERS — advanced patterns ═══ */
  for (const [key, cmd] of commands) {
    if (!cmd.triggers || !cmd.triggers.regex) continue;
    if (!Array.isArray(cmd.triggers.regex)) continue;

    for (const pattern of cmd.triggers.regex) {
      try {
        const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, "i");
        if (re.test(trimmed)) {
          try {
            const args = trimmed.split(/\s+/).slice(1);
            await cmd.execute(api, event, args, db, config, { prefix: config.prefix, commands });
            return true;
          } catch (e) {
            console.log(`[trigger-regex] ${cmd.name}: ${e.message}`);
          }
          return true;
        }
      } catch (_) {}
    }
  }

  return false;
}

module.exports = { checkTriggers };