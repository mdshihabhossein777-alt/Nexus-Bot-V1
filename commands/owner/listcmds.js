/**
 * commands/owner/listcmds.js
 * NEXUS BOT V1 — List all loaded commands
 * © 2026
 */

module.exports = {
  name: "listcmds",
  aliases: ["listcommands", "cmds", "loaded"],
  version: "1.0.0",
  role: 2,
  description: "List all loaded commands",
  usage: "/listcmds [category]",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) { react("⛔"); return; }

    const commands = global.NEXUS && global.NEXUS.commands;
    if (!commands) {
      react("❌");
      return api.sendMessage("❌ Commands map not available", threadID);
    }

    const filterCat = (args[0] || "").toLowerCase();

    /* ═══ Collect unique commands ═══ */
    const unique = new Map();
    for (const [key, cmd] of commands) {
      if (!unique.has(cmd.name)) unique.set(cmd.name, cmd);
    }

    const byCat = {};
    for (const cmd of unique.values()) {
      const cat = cmd.category || "uncategorized";
      if (filterCat && cat !== filterCat) continue;
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(cmd.name);
    }

    const lines = [];
    lines.push("📋 LOADED COMMANDS");
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push(`📊 Total unique: ${unique.size}`);
    lines.push(`📊 Aliases: ${commands.size}`);
    lines.push("");

    const order = ["owner", "admin", "ai", "cloud", "economy", "imagegen", "imagetools", "download", "fun", "utility", "games", "custom", "uncategorized"];
    for (const cat of order) {
      if (!byCat[cat]) continue;
      lines.push(`📁 **${cat.toUpperCase()}** (${byCat[cat].length})`);
      lines.push(`   ${byCat[cat].sort().join(", ")}`);
      lines.push("");
    }

    for (const cat of Object.keys(byCat)) {
      if (order.includes(cat)) continue;
      lines.push(`📁 **${cat.toUpperCase()}** (${byCat[cat].length})`);
      lines.push(`   ${byCat[cat].sort().join(", ")}`);
      lines.push("");
    }

    const text = lines.join("\n");

    react("📋");

    /* ═══ Split if too long ═══ */
    if (text.length > 1500) {
      const chunks = text.match(/[\s\S]{1,1500}/g) || [text];
      for (const chunk of chunks) {
        await new Promise((r) => api.sendMessage(chunk, threadID, () => r()));
      }
    } else {
      api.sendMessage(text, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1