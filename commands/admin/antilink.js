/**
 * commands/admin/antilink.js
 * NEXUS BOT V1 — Antilink configuration
 * © 2026
 */

module.exports = {
  name: "antilink",
  aliases: ["al"],
  version: "2.0.0",
  role: 1,
  description: "Manage antilink system in group",
  usage: "/antilink <on|off|action|maxwarn|whitelist|reset|status>",
  category: "admin",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* Only admins can configure */
    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    const senderIsAdmin = isOwner || (await db.isAdmin(api, threadID, senderID));

    if (!senderIsAdmin) {
      react("⛔");
      return;
    }

    const group = await db.getGroup(threadID);
    const s = group.settings;

    if (!s.antilinkWhitelist) {
      s.antilinkWhitelist = ["github.com", "youtube.com", "youtu.be", "google.com", "wikipedia.org", "render.com"];
    }

    const sub = (args[0] || "status").toLowerCase();
    const val = args.slice(1).join(" ").trim();

    try {
      switch (sub) {
        case "on":
          s.antilink = true;
          group.markModified("settings");
          await group.save();
          react("✅");
          return api.sendMessage("✅ Antilink enabled", threadID);

        case "off":
          s.antilink = false;
          group.markModified("settings");
          await group.save();
          react("✅");
          return api.sendMessage("✅ Antilink disabled", threadID);

        case "action":
          if (!["warn", "kick", "mute"].includes(val)) {
            react("❓");
            return api.sendMessage("Usage: /antilink action <warn|kick|mute>", threadID);
          }
          s.antilinkAction = val;
          group.markModified("settings");
          await group.save();
          react("✅");
          return api.sendMessage(`✅ Action set to: ${val}`, threadID);

        case "maxwarn":
          const n = parseInt(val);
          if (!Number.isFinite(n) || n < 1 || n > 10) {
            react("❓");
            return api.sendMessage("Usage: /antilink maxwarn <1-10>", threadID);
          }
          s.antilinkMaxWarn = n;
          group.markModified("settings");
          await group.save();
          react("✅");
          return api.sendMessage(`✅ Max warnings: ${n}`, threadID);

        case "whitelist":
          if (!val) {
            react("❓");
            return api.sendMessage(`Whitelist: ${s.antilinkWhitelist.join(", ")}`, threadID);
          }
          if (val === "clear") {
            s.antilinkWhitelist = [];
          } else if (val === "default") {
            s.antilinkWhitelist = ["github.com", "youtube.com", "youtu.be", "google.com", "wikipedia.org", "render.com"];
          } else if (val.startsWith("+")) {
            const dom = val.slice(1).trim().toLowerCase();
            if (dom && !s.antilinkWhitelist.includes(dom)) s.antilinkWhitelist.push(dom);
          } else if (val.startsWith("-")) {
            const dom = val.slice(1).trim().toLowerCase();
            s.antilinkWhitelist = s.antilinkWhitelist.filter((d) => d !== dom);
          }
          group.markModified("settings");
          await group.save();
          react("✅");
          return api.sendMessage(`✅ Whitelist: ${s.antilinkWhitelist.join(", ") || "(empty)"}`, threadID);

        case "reset":
          if (val === "all") {
            group.warnings = {};
            group.markModified("warnings");
            await group.save();
            react("✅");
            return api.sendMessage("✅ All warnings cleared", threadID);
          }
          /* Reset for mentioned user or replied user */
          let targetID = null;
          if (mentions && Object.keys(mentions).length) {
            targetID = String(Object.keys(mentions)[0]);
          } else if (messageReply && messageReply.senderID) {
            targetID = String(messageReply.senderID);
          }
          if (!targetID) {
            react("❓");
            return api.sendMessage("Reply or mention user to reset warnings", threadID);
          }
          if (group.warnings && group.warnings[targetID]) {
            group.warnings[targetID].count = 0;
            group.markModified("warnings");
            await group.save();
            react("✅");
            return api.sendMessage(`✅ Warnings reset for <@${targetID}>`, threadID, {
              mentions: [{ tag: targetID, id: targetID }]
            });
          }
          react("❌");
          return api.sendMessage("❌ No warnings found for this user", threadID);

        case "status":
        default:
          const st = [
            `🔗 ANTILINK STATUS`,
            `━━━━━━━━━━━━━━━━━━`,
            `📌 Enabled: ${s.antilink ? "✅ YES" : "❌ NO"}`,
            `⚡ Action: ${s.antilinkAction || "warn"}`,
            `⚠️ Max Warnings: ${s.antilinkMaxWarn || 3}`,
            `✅ Whitelist: ${s.antilinkWhitelist.length} domains`,
            ``,
            `Commands:`,
            `  /antilink on|off`,
            `  /antilink action <warn|kick|mute>`,
            `  /antilink maxwarn <1-10>`,
            `  /antilink whitelist [+domain|-domain|default|clear]`,
            `  /antilink reset <all|reply>`
          ];
          react("✅");
          return api.sendMessage(st.join("\n"), threadID);
      }
    } catch (e) {
      console.error("[antilink] error:", e.message);
      react("❌");
      return api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1