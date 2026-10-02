module.exports = {
  name: "crush", aliases: ["secretcrush"], version: "1.0.0", role: 0,
  description: "Reveal your 'crush' in this group (random)", usage: "/crush",
  execute: async function (api, event, args, db) {
    const { threadID, senderID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const info = await api.getThreadInfo(threadID);
      const ids = (info.participantIDs || []).filter((id) => String(id) !== String(senderID) && String(id) !== String(api.getCurrentUserID()));
      if (!ids.length) return api.sendMessage("⚠️ No one to crush on!", threadID);

      const target = ids[Math.floor(Math.random() * ids.length)];
      const inf = await api.getUserInfo(target);
      const name = inf[target]?.name || target;
      api.sendMessage(`💘 Your secret crush in this group is... <@${target}> (${name}) 😳`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app