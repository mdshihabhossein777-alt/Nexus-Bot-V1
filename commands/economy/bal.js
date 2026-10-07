/**
 * commands/economy/bal.js
 * Wallet — Mastercard style
 */

const ecoCard = require("../../utils/ecoCard");

module.exports = {
  name: "bal",
  aliases: ["balance", "wallet", "coins"],
  version: "2.0.0",
  role: 0,
  description: "Show your wallet (card style)",
  usage: "/bal [@user]",
  category: "economy",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;
    const react = (e) => { if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {} };

    let targetID = String(senderID);
    if (mentions && Object.keys(mentions).length) targetID = String(Object.keys(mentions)[0]);
    else if (messageReply && messageReply.senderID) targetID = String(messageReply.senderID);

    react("💳");

    let userName = "User";
    try {
      const ui = await api.getUserInfo(targetID);
      if (ui[targetID]?.name) userName = ui[targetID].name;
    } catch (_) {}

    const user = await db.getUser(targetID);
    const avatar = await ecoCard.getAvatar(targetID).catch(() => null);

    const cardBuf = await ecoCard.generateEcoCard({
      userName,
      userID: targetID,
      balance: user.balance || 0,
      bank: user.bank || 0,
      type: "wallet",
      avatarBuf: avatar
    });

    const fs = require("fs-extra");
    const path = require("path");
    const os = require("os");
    const tmp = path.join(os.tmpdir(), `eco_bal_${Date.now()}.png`);
    await fs.writeFile(tmp, cardBuf);

    return api.sendMessage({
      body: `💳 **${userName}** • Wallet`,
      attachment: fs.createReadStream(tmp)
    }, threadID, () => {
      try { fs.unlinkSync(tmp); } catch (_) {}
    });
  }
};