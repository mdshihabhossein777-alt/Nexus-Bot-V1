module.exports = {
  name: "transfer", aliases: ["pay2"], version: "1.0.0", role: 0,
  description: "Transfer money to another user", usage: "/transfer @user <amount>",
  execute: async function (api, event, args, db) {
    const { threadID, senderID, mentions, messageReply } = event;
    try {
      let target = null;
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);
      if (!target) return api.sendMessage("📝 Usage: /transfer @user <amount>", threadID);
      if (target === String(senderID)) return api.sendMessage("⚠️ Can't pay yourself.", threadID);
      const amount = parseInt(args[args.length-1]);
      if (!Number.isFinite(amount) || amount <= 0) return api.sendMessage("⚠️ Invalid amount.", threadID);
      const s = await db.getUser(senderID);
      if (amount > (s.balance||0)) return api.sendMessage(`⚠️ Only $${(s.balance||0).toLocaleString()}.`, threadID);
      const r = await db.getUser(target);
      s.balance -= amount;
      r.balance = (r.balance||0) + amount;
      await s.save(); await r.save();
      db.cache.set(`user_${senderID}`, s, 60);
      db.cache.set(`user_${target}`, r, 60);
      api.sendMessage(`💸 Sent $${amount.toLocaleString()} to <@${target}>.`, threadID);
    } catch (e) { api.sendMessage("Error: " + e.message, threadID); }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app