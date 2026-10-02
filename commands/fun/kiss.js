// commands/fun/kiss.js - NEXUS V1 - Fixed
const { generateCoupleCard, loadAvatar } = require("../../utils/coupleCard");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

function react(api, emoji, messageID, threadID) {
  return new Promise((resolve) => {
    if (!messageID || !threadID) return resolve(false);
    try {
      api.setMessageReaction(emoji, messageID, threadID, (err) => resolve(!err));
    } catch (_) { resolve(false); }
  });
}

module.exports = {
  name: "kiss",
  aliases: ["kiss2", "smooch"],
  version: "3.0.0",
  role: 0,
  description: "Kiss someone with a romantic card 💋",
  usage: "/kiss @user",
  execute: async function (api, event, args, db) {
    const { threadID, senderID, mentions, messageReply, messageID } = event;
    let tmpPath = null;

    try {
      let target = null;
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);

      if (!target) return api.sendMessage("💋 Usage: /kiss @user", threadID);
      if (target === String(senderID)) return api.sendMessage("😅 নিজেকে kiss করা যায় না!", threadID);

      await react(api, "⏳", messageID, threadID);

      let name1 = "You", name2 = "Partner";
      try {
        const info = await api.getUserInfo([String(senderID), target]);
        if (info[String(senderID)]) name1 = info[String(senderID)].name;
        if (info[target]) name2 = info[target].name;
      } catch (_) {}

      const av1 = await loadAvatar(String(senderID));
      const av2 = await loadAvatar(target);

      const buf = await generateCoupleCard({
        scenePrompt: "anime couple kissing romantically in the rain under a transparent umbrella at night, city lights bokeh, cinematic romantic mood",
        user1Name: name1,
        user1Avatar: av1,
        user2Name: name2,
        user2Avatar: av2,
        message: "kissed",
        emoji: "💋",
        ringColor1: "#ff3d8b",
        ringColor2: "#00d9ff",
        extraText: ""
      });

      tmpPath = path.join(os.tmpdir(), `nexus_kiss_${Date.now()}.png`);
      await fs.writeFile(tmpPath, buf);

      await react(api, "✅", messageID, threadID);

      api.sendMessage({
        body: `💋 ${name1} kissed ${name2} 😘`,
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[kiss] error:", e.message);
      await react(api, "❌", messageID, threadID);
      api.sendMessage("❌ Failed: " + e.message, threadID);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    }
  }
};
// Powered by Shihab