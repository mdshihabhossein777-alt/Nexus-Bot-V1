const axios = require("axios");
const GIFS = [
  "https://media.giphy.com/media/109ltuoSQT212w/giphy.gif",
  "https://media.giphy.com/media/ARSp9T7wwxNcs/giphy.gif",
  "https://media.giphy.com/media/ye7OTQgwmVuVy/giphy.gif"
];
module.exports = {
  name: "pat", aliases: ["headpat"], version: "1.0.0", role: 0,
  description: "Pat someone on the head", usage: "/pat [@user]",
  execute: async function (api, event, args, db) {
    const { threadID, senderID, mentions, messageReply } = event;
    try {
      let target = null, name = null;
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);
      if (target) {
        try { const i = await api.getUserInfo(target); if (i[target]) name = i[target].name; } catch (e) {}
      }
      const url = GIFS[Math.floor(Math.random() * GIFS.length)];
      const r = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
      const body = target ? `🫶 <@${senderID}> pats ${name || target}!` : `🫶 Pat pat!`;
      api.sendMessage({ body, attachment: Buffer.from(r.data) }, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app