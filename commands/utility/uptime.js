module.exports = {
  name: "uptime", aliases: ["runtime"], version: "1.0.0", role: 0,
  description: "Show bot uptime", usage: "/uptime",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    const s = Math.floor((Date.now() - global.NEXUS.START_TIME) / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    api.sendMessage(`⏱️ Uptime: ${d}d ${h}h ${m}m ${sec}s`, threadID);
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app