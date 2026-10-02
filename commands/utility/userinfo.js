module.exports = {
  name: "userinfo", aliases: ["whois"], version: "1.0.0", role: 0,
  description: "Show info about a user", usage: "/userinfo [@user]",
  execute: async function (api, event, args, db) {
    const { threadID, senderID, mentions, messageReply } = event;
    try {
      let target = String(senderID);
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);

      const info = await api.getUserInfo(target);
      const u = info[target] || {};
      const profile = await db.getUser(target);

      api.sendMessage(
        `👤 USER INFO\n────────────\n` +
        `📛 Name: ${u.name || "Unknown"}\n` +
        `🆔 UID: ${target}\n` +
        `⚧ Gender: ${u.gender === 2 ? "Male" : u.gender === 1 ? "Female" : "Unknown"}\n` +
        `🌐 Username: ${u.vanity || "N/A"}\n` +
        `🔗 Profile: ${u.profileUrl || `https://facebook.com/${target}`}\n` +
        `🐣 Birthday: ${u.isBirthday ? "🎉 Today!" : "N/A"}\n\n` +
        `💰 Wallet: $${(profile.balance || 0).toLocaleString()}\n` +
        `🏦 Bank: $${(profile.bank || 0).toLocaleString()}`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app