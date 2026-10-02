const axios = require("axios");
module.exports = {
  name: "ipinfo", aliases: ["ipinfo2"], version: "1.0.0", role: 0,
  description: "IP info via ipapi.co", usage: "/ipinfo <ip>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const ip = args[0] || "";
      const url = ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/";
      const r = await axios.get(url, { timeout: 10000 });
      const d = r.data;
      if (d.error) return api.sendMessage("❌ " + d.reason, threadID);
      api.sendMessage(
        `🌐 IP INFO\n────────────\n` +
        `📡 ${d.ip}\n` +
        `🌍 ${d.country_name} (${d.country_code})\n` +
        `🏙️ ${d.city}, ${d.region}\n` +
        `📶 ${d.org || "N/A"}\n` +
        `🕐 ${d.timezone}\n` +
        `📍 ${d.latitude}, ${d.longitude}`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app