const axios = require("axios");
module.exports = {
  name: "ip", aliases: ["myip"], version: "1.0.0", role: 0,
  description: "Show info about an IP (or your own if blank)", usage: "/ip [ip]",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const ip = args[0] || "";
      const url = ip ? `http://ip-api.com/json/${ip}` : "http://ip-api.com/json/";
      const r = await axios.get(url, { timeout: 10000 });
      const d = r.data;
      if (d.status !== "success") return api.sendMessage("❌ IP lookup failed: " + (d.message || "unknown"), threadID);
      api.sendMessage(
        `🌐 IP INFO\n────────────\n` +
        `📡 IP: ${d.query}\n` +
        `🌍 Country: ${d.country} (${d.countryCode})\n` +
        `🏙️ City: ${d.city}, ${d.regionName}\n` +
        `📮 ZIP: ${d.zip || "N/A"}\n` +
        `🕐 Timezone: ${d.timezone}\n` +
        `📶 ISP: ${d.isp}\n` +
        `🏢 Org: ${d.org}\n` +
        `📍 Lat/Lon: ${d.lat}, ${d.lon}`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app