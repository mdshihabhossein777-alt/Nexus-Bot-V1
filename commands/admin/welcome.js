module.exports = {
  name: "welcome",
  aliases: ["wlc"],
  version: "3.0.0",
  role: 0,
  description: "Show welcome system status (always on)",
  usage: "/welcome",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      api.sendMessage(
        `👋 WELCOME SYSTEM\n` +
        `────────────\n` +
        `✅ Status: ALWAYS ON\n` +
        `📸 Sends card with:\n` +
        `   • New member photo + name\n` +
        `   • Adder photo + name\n` +
        `   • Group name\n` +
        `\n💡 No command needed — new members are auto-welcomed.`,
        threadID
      );
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// Powered by Shihab