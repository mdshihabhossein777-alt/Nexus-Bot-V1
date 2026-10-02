// commands/fun/fox.js - NEXUS V1 - শিয়াল meme
const { generateAnimalMeme, loadAvatar } = require("../../utils/animalMeme");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

module.exports = {
  name: "fox",
  aliases: [],
  version: "1.0.0",
  role: 0,
  description: "Make someone a শিয়াল 🦊",
  usage: "/fox @user  (or reply to a message)",
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
        animalPrompt: "cute red fox",
        userName: name,
        userAvatar: avatar,
        emoji: "🦊",
        label: "শিয়াল"
      });

      /* ---- Save + Send ---- */
      tmpPath = path.join(os.tmpdir(), `nexus_fox_${Date.now()}.png`);
      await fs.writeFile(tmpPath, buf);

      api.sendMessage({
        body: `🦊 এই লে ${name} কে শিয়াল বানিয়ে দিলাম! 😂`,
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[fox] error:", e.message);
      api.sendMessage("❌ Failed: " + e.message, threadID);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    }
  }
};
// Powered by Shihab
