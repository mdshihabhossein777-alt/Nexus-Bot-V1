module.exports = {
  name: "warnings", version: "1.0.0", role: 0,
  description: "Show the warning list of this group",
  usage: "/warnings",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const g = await db.getGroup(threadID);
      const entries = Object.entries(g.warnings || {}).filter(([, v]) => v > 0);
      if (!entries.length) return api.sendMessage("✨ No warnings recorded.", threadID);
      let names = {};
      try { names = await api.getUserInfo(entries.map(([id]) => id)); } catch (e) {}
      const list = entries.sort((a, b) => b[1] - a[1])
        .map(([id, v], i) => `${i + 1}. ${(names[id] && names[id].name) || id} — ${v} ⚠️`)
        .join("\n");
      api.sendMessage(`⚠️ WARNING LIST (${entries.length})\n────────────\n${list}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};