// commands/fun/hug.js - NEXUS V1 - Fixed
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
  name: "hug",
  aliases: ["hug2", "embrace"],
  version: "3.0.0",
  role: 0,
  description: "Hug someone with a warm card 🤗",
  usage: "/hug @user",
  execute: async function (api, event, args, db) {
    const { threadID, senderID, mentions, messageReply, messageID } = event;
    let tmpPath = null;

    try {
      let target = null;
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);

      if (!target) return api.sendMessage("🤗 Usage: /hug @user", threadID);

      await react(api, "⏳", messageID, threadID);

      let name1 = "You", name2 = "Friend";
      try {
        const info = await api.getUserInfo([String(senderID), target]);
        if (info[String(senderID)]) name1 = info[String(senderID)].name;
        if (info[target]) name2 = info[target].name;
      } catch (_) {}

      const av1 = await loadAvatar(String(senderID));
      const av2 = await loadAvatar(target);

      const buf = await generateCoupleCard({
        scenePrompt: "anime couple hugging warmly in a flower garden, spring cherry blossoms, soft pastel colors, warm emotional scene",
        user1Name: name1,
        user1Avatar: av1,
        user2Name: name2,
        user2Avatar: av2,
        message: "hugged",
        emoji: "🤗",
        ringColor1: "#ffb347",
        ringColor2: "#ff3d8b",
        extraText: ""
      });

      tmpPath = path.join(os.tmpdir(), `nexus_hug_${Date.now()}.png`);
      await fs.writeFile(tmpPath, buf);

      await react(api, "✅", messageID, threadID);

      api.sendMessage({
        body: `🤗 ${name1} hugged ${name2}!`,
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[hug] error:", e.message);
      await react(api, "❌", messageID, threadID);
      api.sendMessage("❌ Failed: " + e.message, threadID);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    }
  }
};
// Powered by Shihab