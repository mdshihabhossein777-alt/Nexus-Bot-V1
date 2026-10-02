module.exports = {
  name: "allkick", aliases: ["cleargroup"], version: "1.0.0", role: 2,
  description: "OWNER ONLY: Remove every member from the current group",
  usage: "/allkick confirm",
  execute: async function (api, event, args, db) {
    const { threadID, senderID } = event;
    try {
      if (!event.isGroup) return api.sendMessage("⚠️ Groups only.", threadID);
      if ((args[0] || "").toLowerCase() !== "confirm") {
        return api.sendMessage(
          "⚠️ DANGER ZONE\n\n" +
          "This will remove EVERY member except the bot and admins.\n" +
          "To confirm, type: /allkick confirm",
          threadID
        );
      }

      const info = await api.getThreadInfo(threadID);
      const adminIDs = new Set((info.adminIDs || []).map((a) => String(a.id || a)));
      const me = String(api.getCurrentUserID());

      const targets = (info.participantIDs || []).filter((id) => {
        const sid = String(id);
        return sid !== me && !adminIDs.has(sid);
      });

      if (!targets.length) return api.sendMessage("✅ No members to kick.", threadID);

      api.sendMessage(`⚠️ Kicking ${targets.length} members... this may take a while.`, threadID);

      let ok = 0, fail = 0;
      for (const id of targets) {
        try { await api.removeUserFromGroup(id, threadID); ok++; }
        catch (e) { fail++; }
        await new Promise((r) => setTimeout(r, 1500));
      }

      api.sendMessage(`✅ Done. Kicked: ${ok} | Failed: ${fail}`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app