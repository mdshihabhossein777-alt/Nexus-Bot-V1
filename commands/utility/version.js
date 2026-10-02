module.exports = {
  name: "version", aliases: ["ver", "v"], version: "1.0.0", role: 0,
  description: "Show bot version", usage: "/version",
  execute: async function (api, event, args, db, config) {
    const { threadID } = event;
    api.sendMessage(
      `🤖 ${config.brandName}\n` +
      `📌 Version: 1.0.0\n` +
      `👤 Owner: ${config.brandOwner}\n` +
      `🔗 ${config.brandFB}`,
      threadID
    );
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app