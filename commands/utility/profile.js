module.exports = {
  name: "profile", aliases: ["me"], version: "1.0.0", role: 0,
  description: "Show your profile card", usage: "/profile [@user]",
  execute: async function (api, event, args, db) {
    const { threadID, senderID, mentions, messageReply } = event;
    try {
      let target = String(senderID);
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);

      const info = await api.getUserInfo(target);
      const u = info[target] || {};
      const p = await db.getUser(target);
      const inv = Object.keys(p.inventory || {}).length;

      let avatar = null;
      try {
        const r = await global.NEXUS.api.httpGet ? null : null;
      } catch (e) {}

      api.sendMessage(
        `╔════════════════════╗\n` +
        `║  👤 PROFILE CARD   ║\n` +
        `╚════════════════════╝\n` +
        `📛 ${u.name || "Unknown"}\n` +
        `🆔 ${target}\n` +
        `────────────\n` +
        `💰 Wallet: $${(p.balance || 0).toLocaleString()}\n` +
        `🏦 Bank: $${(p.bank || 0).toLocaleString()}\n` +
        `📊 Total: $${((p.balance || 0) + (p.bank || 0)).toLocaleString()}\n` +
        `🎒 Items: ${inv}\n` +
        `💼 Job: ${p.job || "Unemployed"}`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app