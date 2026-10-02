const axios = require("axios");
module.exports = {
  name: "weather", aliases: ["w"], version: "1.0.0", role: 0,
  description: "Get current weather for a city", usage: "/weather <city>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const city = args.join(" ").trim();
      if (!city) return api.sendMessage("🌤️ Usage: /weather <city>", threadID);
      api.sendMessage(`🔍 Fetching weather for ${city}...`, threadID);
      const r = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { timeout: 15000 });
      const d = r.data;
      if (!d || !d.current_condition) throw new Error("City not found.");
      const c = d.current_condition[0];
      const area = d.nearest_area?.[0];
      const loc = area ? `${area.areaName?.[0]?.value}, ${area.country?.[0]?.value}` : city;
      api.sendMessage(
        `🌤️ WEATHER — ${loc}\n────────────\n` +
        `🌡️ ${c.temp_C}°C / ${c.temp_F}°F (Feels ${c.FeelsLikeC}°C)\n` +
        `☁️ ${c.weatherDesc?.[0]?.value}\n` +
        `💧 Humidity: ${c.humidity}%\n` +
        `💨 Wind: ${c.windspeedKmph} km/h\n` +
        `👁️ Visibility: ${c.visibility} km`,
        threadID
      );
    } catch (e) { api.sendMessage("❌ Weather failed: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app