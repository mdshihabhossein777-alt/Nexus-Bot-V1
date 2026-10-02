const LINES = [
  "If you were a star, I'd stay up all night watching you ✨",
  "I must be a snowflake because I've fallen for you ❄️",
  "Do you have a Band-Aid? Because I just scraped my knee falling for you 💕",
  "You're like a dictionary — you add meaning to my life 📖",
  "Are you a campfire? Because you're hot and I want s'more 🔥",
  "If I could rearrange the alphabet, I'd put U and I together 💌",
  "Do you have a pencil? Because I want to erase your past and write our future ✏️"
];
module.exports = {
  name: "flirt", version: "1.0.0", role: 0,
  description: "Send a flirty line", usage: "/flirt [@user]",
  execute: async function (api, event, args, db) {
    const { threadID, mentions, messageReply } = event;
    try {
      const line = LINES[Math.floor(Math.random() * LINES.length)];
      const ids = Object.keys(mentions || {});
      if (ids.length) return api.sendMessage(`💕 <@${ids[0]}> ${line}`, threadID);
      if (messageReply && messageReply.senderID) return api.sendMessage(`💕 <@${messageReply.senderID}> ${line}`, threadID);
      api.sendMessage(`💕 ${line}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app