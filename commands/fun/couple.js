module.exports = {
  name: "couple", aliases: ["lovebirds"], version: "1.0.0", role: 0,
  description: "Find a random couple in the group", usage: "/couple",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const info = await api.getThreadInfo(threadID);
      const ids = (info.participantIDs || []).filter((id) => String(id) !== String(api.getCurrentUserID()));
      if (ids.length < 2) return api.sendMessage("⚠️ Not enough members.", threadID);

      const a = ids[Math.floor(Math.random() * ids.length)];
      let b = ids[Math.floor(Math.random() * ids.length)];
      let tries = 0;
      while (b === a && tries++ < 10) b = ids[Math.floor(Math.random() * ids.length)];
      if (b === a) return api.sendMessage("⚠️ Could not find a couple. Try again.", threadID);

      const inf = await api.getUserInfo([a, b]);
      const na = inf[a]?.name || a, nb = inf[b]?.name || b;
      api.sendMessage(`💑 Today's couple:\n\n${na} ❤️ ${nb}\n\nCongratulations! 🎉`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app