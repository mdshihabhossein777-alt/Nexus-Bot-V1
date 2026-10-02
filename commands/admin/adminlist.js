module.exports = {
  name: "adminlist", aliases: ["admins"], version: "1.0.0", role: 0,
  description: "List all group admins",
  usage: "/adminlist",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const info = await api.getThreadInfo(threadID);
      const ids = [...new Set((info.adminIDs || []).map((a) => String(a.id || a)))];
      const me = String(api.getCurrentUserID());
      if (!ids.includes(me)) ids.push(me);
      let names = {};
      try { names = await api.getUserInfo(ids); } catch (e) {}
      const list = ids.map((id, i) => `${i + 1}. ${(names[id] && names[id].name) || "Unknown"}${id === me ? " 🤖 (bot)" : ""}`).join("\n");
      api.sendMessage(`👑 GROUP ADMINS (${ids.length})\n────────────\n${list}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};