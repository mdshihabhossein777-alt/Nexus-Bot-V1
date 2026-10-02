module.exports = {
  name: "allnick", aliases: ["massnick"], version: "1.0.0", role: 1,
  description: "Change the nickname of all members in this group",
  usage: "/allnick <nickname>   (use {name} for original name)",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      const template = args.join(" ").trim();
      if (!template) {
        return api.sendMessage(
          "📝 Usage: /allnick <nickname>\nUse {name} to insert original name.\n" +
          "Example: /allnick Nexus | {name}",
          threadID
        );
      }

      const info = await api.getThreadInfo(threadID);
      const me = String(api.getCurrentUserID());
      const members = (info.participantIDs || []).filter((id) => String(id) !== me);
      if (!members.length) return api.sendMessage("⚠️ No other members.", threadID);

      api.sendMessage(`🔄 Renaming ${members.length} members... (this takes time)`, threadID);

      let ok = 0, fail = 0;
      const names = await api.getUserInfo(members);
      for (const id of members) {
        try {
          const origName = names[String(id)]?.firstName || "friend";
          const newNick = template.replace(/{name}/g, origName).slice(0, 32);
          await api.changeNickname(newNick, threadID, String(id));
          ok++;
        } catch (e) { fail++; }
        await new Promise((r) => setTimeout(r, 1200));
      }

      api.sendMessage(`✅ Renamed: ${ok} | Failed: ${fail}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app