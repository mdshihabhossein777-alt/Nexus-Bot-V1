module.exports = {
  name: "info", aliases: ["about", "botinfo"], version: "1.0.0", role: 0,
  description: "About the bot", usage: "/info",
  execute: async function (api, event, args, db, config) {
    const { threadID } = event;
    api.sendMessage(
      `╔═══════════════════╗\n` +
      `║  NEXUS BOT V1     ║\n` +
      `║  The Connected Light ║\n` +
      `╚═══════════════════╝\n` +
      `👤 Owner: ${config.brandOwner}\n` +
      `📘 FB: ${config.brandFB}\n` +
      `🔧 Prefix: ${config.prefix}\n` +
      `📦 Version: 1.0.0\n` +
      `🤖 Commands: ${global.NEXUS.commands.size}\n` +
      `🌐 Platform: fca-unofficial + MongoDB\n` +
      `☁️ Hosted on: Render.com`,
      threadID
    );
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app