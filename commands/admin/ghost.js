module.exports = {
  name: "ghost", aliases: ["ghostping"], version: "1.0.0", role: 0,
  description: "Send a ghost message that disappears after 3 seconds",
  usage: "/ghost <text>",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const text = args.join(" ").trim() || "👻 Boo!";
      api.sendMessage(`👻 ${text}`, threadID, (err, info) => {
        if (err || !info) return;
        setTimeout(() => {
          try { api.unsendMessage(info.messageID); } catch (e) {}
        }, 3000);
      });
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};