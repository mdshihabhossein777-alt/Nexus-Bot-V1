/**
 * commands/owner/deploy.js
 * NEXUS BOT V1 — Trigger Render deploy manually
 * © 2026
 */

const axios = require("axios");

module.exports = {
  name: "deploy",
  aliases: ["deploynow", "rebuild", "redeploy"],
  version: "1.0.0",
  role: 2,
  description: "Trigger Render deploy manually",
  usage: "/deploy",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) { react("⛔"); return; }

    const hookUrl = process.env.RENDER_DEPLOY_HOOK;

    if (!hookUrl) {
      react("❌");
      return api.sendMessage(
        "❌ Deploy hook not set\n\n" +
        "📝 Setup:\n" +
        "1. Render → Settings → Deploy Hook\n" +
        "2. Create Deploy Hook\n" +
        "3. Copy URL\n" +
        "4. Add env: RENDER_DEPLOY_HOOK=...",
        threadID
      );
    }

    react("🚀");
    await api.sendMessage(
      "🚀 **DEPLOY TRIGGERED**\n" +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "⏳ Render rebuilding...\n" +
      "⏱️ ~2-3 min wait",
      threadID
    );

    try {
      const r = await axios.post(hookUrl, {}, { timeout: 30000 });
      console.log(`[deploy] triggered: ${r.status}`);

      return api.sendMessage(
        "✅ **DEPLOY STARTED**\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "📊 Status: " + (r.status || 200) + "\n" +
        "⏱️ Bot restart in ~2 min",
        threadID
      );

    } catch (e) {
      console.error("[deploy] error:", e.message);
      react("❌");
      return api.sendMessage(
        `❌ Deploy failed\n${e.message.slice(0, 100)}`,
        threadID
      );
    }
  }
};

// © 2026 NEXUS BOT V1