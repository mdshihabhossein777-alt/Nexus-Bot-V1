// commands/fun/tiger.js - NEXUS V1 - বাঘ meme
const { generateAnimalMeme, loadAvatar } = require("../../utils/animalMeme");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

module.exports = {
  name: "tiger",
  aliases: [],
  version: "1.0.0",
  role: 0,
  description: "Make someone a বাঘ 🐯",
  usage: "/tiger @user  (or reply to a message)",
  execute: async function (api, event, args, db, config) {
    const { threadID, senderID, mentions, messageReply } = event;
    let tmpPath = null;

    try {
      /* ---- Resolve target user ---- */
      let target = String(senderID);
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);

      /* ---- Get name + avatar ---- */
      let name = "User";
      try {
        const info = await api.getUserInfo(target);
        if (info && info[target] && info[target].name) name = info[target].name;
      } catch (_) {}

      const avatar = await loadAvatar(target);

      /* ---- Generate card ---- */
      const buf = await generateAnimalMeme({
        animalPrompt: "royal bengal tiger face",
        userName: name,
        userAvatar: avatar,
        emoji: "🐯",
        label: "বাঘ"
      });

      /* ---- Save + Send ---- */
      tmpPath = path.join(os.tmpdir(), `nexus_tiger_${Date.now()}.png`);
      await fs.writeFile(tmpPath, buf);

      api.sendMessage({
        body: `🐯 এই লে ${name} কে বাঘ বানিয়ে দিলাম! 😂`,
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[tiger] error:", e.message);
      api.sendMessage("❌ Failed: " + e.message, threadID);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    }
  }
};
// Powered by Shihab
