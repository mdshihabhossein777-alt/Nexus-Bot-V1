// commands/utility/out.js - NEXUS V1 - Bot leaves current group
module.exports = {
  name: "out",
  aliases: ["leave", "left", "exit", "bye"],
  version: "1.0.0",
  role: 2,
  description: "OWNER ONLY: Bot leaves the current group",
  usage: "/out",
  execute: async function (api, event, args, db, config) {
    const { threadID, isGroup } = event;

    try {
      if (!isGroup) {
        return api.sendMessage("⚠️ This command only works in groups.", threadID);
      }

      api.sendMessage(
        `👋 ${config.brandName} leaving this group...\n\nGoodbye! ✨`,
        threadID,
        async (err) => {
          if (err) return;

          setTimeout(async () => {
            try {
              await api.removeUserFromGroup(
                String(api.getCurrentUserID()),
                threadID
              );
              console.log(`[out] Bot left group ${threadID}`);
            } catch (e) {
              console.error("[out] failed:", e.message);
              try {
                api.sendMessage(
                  `❌ Could not leave: ${e.message}\n\n💡 Make sure bot is admin or group is not locked.`,
                  threadID
                );
              } catch (_) {}
            }
          }, 2000);
        }
      );

    } catch (e) {
      api.sendMessage("Error: " + e.message, threadID);
    }
  }
};
// Powered by Shihab