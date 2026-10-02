module.exports = {
  name: "menu", aliases: ["help", "cmds", "commands", "list"], version: "1.0.0", role: 0,
  description: "Show all commands", usage: "/menu [category]",
  execute: async function (api, event, args, db, config) {
    const { threadID } = event;
    try {
      const cat = (args[0] || "").toLowerCase();
      const byCat = {};
      const seen = new Set();
      for (const [key, cmd] of global.NEXUS.commands) {
        if (seen.has(cmd)) continue;
        seen.add(cmd);
        const c = cmd.category || "uncategorized";
        byCat[c] = byCat[c] || [];
        byCat[c].push(cmd.name);
      }

      if (cat && byCat[cat]) {
        const list = byCat[cat].sort().map((n) => `  ${config.prefix}${n}`).join("\n");
        return api.sendMessage(`📂 ${cat.toUpperCase()} (${byCat[cat].length})\n────────────\n${list}`, threadID);
      }

      const total = Object.values(byCat).reduce((a, b) => a + b.length, 0);
      const lines = Object.entries(byCat).map(([c, arr]) => `📂 ${c.padEnd(14)} ${arr.length}`);

      api.sendMessage(
        `🤖 NEXUS BOT V1 — COMMANDS\n` +
        `📦 Total: ${total}\n` +
        `🔧 Prefix: ${config.prefix}\n` +
        `────────────\n${lines.join("\n")}\n\n` +
        `💡 Use ${config.prefix}menu <category> to list one category.`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app