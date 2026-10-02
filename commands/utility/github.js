const axios = require("axios");
module.exports = {
  name: "github", aliases: ["gh"], version: "1.0.0", role: 0,
  description: "Get GitHub user info", usage: "/github <username>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const user = args[0];
      if (!user) return api.sendMessage("🐙 Usage: /github <username>", threadID);
      const r = await axios.get(`https://api.github.com/users/${user}`, {
        timeout: 10000,
        headers: { "User-Agent": "NexusBot" }
      });
      const d = r.data;
      if (!d || !d.login) throw new Error("User not found.");
      api.sendMessage(
        `🐙 GITHUB — ${d.login}\n────────────\n` +
        `📛 ${d.name || d.login}\n` +
        `📝 ${d.bio || "No bio"}\n` +
        `📍 ${d.location || "N/A"}\n` +
        `🏢 ${d.company || "N/A"}\n` +
        `📦 Public Repos: ${d.public_repos}\n` +
        `👥 Followers: ${d.followers} | Following: ${d.following}\n` +
        `🔗 ${d.html_url}`,
        threadID
      );
    } catch (e) {
      if (e.response?.status === 404) return api.sendMessage("❌ GitHub user not found.", threadID);
      api.sendMessage("❌ GitHub failed: " + e.message, threadID);
    }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app