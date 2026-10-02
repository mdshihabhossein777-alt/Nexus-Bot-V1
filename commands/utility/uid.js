module.exports = {
  name: "uid", aliases: ["myid"], version: "1.0.0", role: 0,
  description: "Show your or mentioned user's UID", usage: "/uid [@user]",
  execute: async function (api, event, args, db) {
    const { threadID, senderID, mentions, messageReply } = event;
    try {
      let target = String(senderID), name = "you";
      const ids = Object.keys(mentions || {});
      if (ids.length) { target = String(ids[0]); name = mentions[target] || "user"; }
      else if (messageReply && messageReply.senderID) {
        target = String(messageReply.senderID);
        try { const i = await api.getUserInfo(target); if (i[target]) name = i[target].name; } catch (e) {}
      }
      api.sendMessage(`🆔 ${name}'s UID:\n${target}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app