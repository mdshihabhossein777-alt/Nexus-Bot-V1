module.exports = {
  name: "ship", aliases: ["lovecalc"], version: "1.0.0", role: 0,
  description: "Calculate love compatibility between two users",
  usage: "/ship @user1 @user2  or  /ship @user",
  execute: async function (api, event, args, db) {
    const { threadID, senderID, mentions, messageReply } = event;
    try {
      const ids = Object.keys(mentions || {});
      let a = String(senderID), b = null;

      if (ids.length >= 2) { a = String(ids[0]); b = String(ids[1]); }
      else if (ids.length === 1) { b = String(ids[0]); }
      else if (messageReply && messageReply.senderID) { b = String(messageReply.senderID); }

      if (!b) return api.sendMessage("💞 Mention someone: /ship @user", threadID);
      if (a === b) return api.sendMessage("💞 Can't ship someone with themselves 😅", threadID);

      // Deterministic hash so it's stable per pair
      const key = [a, b].sort().join("-");
      let h = 0;
      for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xffffffff;
      const pct = Math.abs(h) % 101;

      let nameA = a, nameB = b;
      try {
        const inf = await api.getUserInfo([a, b]);
        if (inf[a]) nameA = inf[a].name;
        if (inf[b]) nameB = inf[b].name;
      } catch (e) {}

      let emoji = "💔";
      if (pct >= 80) emoji = "💖💍";
      else if (pct >= 60) emoji = "💕";
      else if (pct >= 40) emoji = "💗";
      else if (pct >= 20) emoji = "💓";

      api.sendMessage(
        `💞 SHIP CALCULATOR\n────────────\n${nameA} ❤️ ${nameB}\n\n${emoji} ${pct}% match!`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app