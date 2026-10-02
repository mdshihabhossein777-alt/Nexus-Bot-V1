module.exports = {
  name: "poll", aliases: ["vote"], version: "1.0.0", role: 0,
  description: "Create a quick Yes/No poll using reactions",
  usage: "/poll Should we play music?",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const question = args.join(" ").trim();
      if (!question) return api.sendMessage("📊 Usage: /poll <question>", threadID);
      api.sendMessage(
        `📊 POLL\n────────────\n${question}\n\n👍 = Yes    👎 = No`,
        threadID,
        (err, info) => {
          if (err || !info) return;
          setTimeout(() => { try { api.setMessageReaction("👍", info.messageID, () => {}, true); } catch (e) {} }, 900);
          setTimeout(() => { try { api.setMessageReaction("👎", info.messageID, () => {}, true); } catch (e) {} }, 1800);
        }
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};