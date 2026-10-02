module.exports = {
  name: "tid", aliases: ["threadid"], version: "1.0.0", role: 0,
  description: "Show this chat's thread ID", usage: "/tid",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    api.sendMessage(`🆔 Thread ID:\n${threadID}`, threadID);
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app