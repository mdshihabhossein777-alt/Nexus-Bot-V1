"use strict";

const axios = require("axios");

function extractUID(text) {
  if (!text) return null;
  const url = String(text).trim();

  // Profile.php?id=XXXX
  let m = url.match(/profile\.php\?id=(\d+)/i);
  if (m) return m[1];

  // facebook.com/username
  m = url.match(/facebook\.com\/([a-zA-Z0-9.]+)(?:[\/?#]|$)/i);
  if (m) {
    const seg = m[1];
    if (["profile", "photo", "watch", "groups", "pages", "story"].includes(seg.toLowerCase())) return null;
    return seg;
  }

  // fb.com/username
  m = url.match(/fb\.com\/([a-zA-Z0-9.]+)/i);
  if (m) return m[1];

  // Pure numeric UID
  if (/^\d{8,}$/.test(url)) return url;
  return null;
}

module.exports = {
  name: "adduser",
  aliases: ["au"],
  version: "1.0.0",
  role: 1, // Group Admin Only (role 2 for Owner only)
  description: "Add a user to the current group via UID or FB link",
  usage: "/adduser <uid|fb-link>",
  category: "admin",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, body, messageReply } = event;
    const react = (emoji) => { if (messageID) try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {} };

    // Owner/Admin Check
    const isOwner = String(senderID) === String(config.ownerID) || (config.adminIDs || []).map(String).includes(String(senderID));
    const isAdmin = isOwner || (await db.isAdmin(api, threadID, senderID));
    if (!isAdmin) { react("⛔"); return api.sendMessage("🚫 Only admins can use this command.", threadID); }

    // Get UID
    let targetUID = null;
    let input = (args || []).join(" ").trim();
    
    // If replying to a message, try to get UID from reply
    if (!input && messageReply && messageReply.senderID) {
      targetUID = String(messageReply.senderID);
    } else {
      targetUID = extractUID(input);
    }

    if (!targetUID) {
      react("❌");
      return api.sendMessage(
        "📌 Usage: /adduser <UID or FB link>\n" +
        "Example:\n" +
        "• /adduser 61590897712943\n" +
        "• /adduser https://facebook.com/profile.php?id=...\n" +
        "• Reply to a user's message with /adduser",
        threadID
      );
    }

    // Prevent adding the bot itself
    const me = String(api.getCurrentUserID());
    if (targetUID === me) {
      react("❌");
      return api.sendMessage("❌ Can't add the bot itself.", threadID);
    }

    react("⏳");

    try {
      // Fetch user info (to confirm name)
      let targetName = targetUID;
      try {
        const info = await api.getUserInfo(targetUID);
        if (info && info[targetUID] && info[targetUID].name) targetName = info[targetUID].name;
      } catch (_) {}

      // Add user to group
      await new Promise((resolve, reject) => {
        api.addUserToGroup(targetUID, threadID, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      // Success message
      react("✅");
      return api.sendMessage(
        `✅ Added to group: ${targetName}\n` +
        `🆔 UID: ${targetUID}`,
        threadID
      );

    } catch (e) {
      console.error("[adduser] error:", e.message);
      react("❌");
      
      let errLine = "❌ Failed to add user.";
      if (e.message && e.message.includes("This person isn't available right now")) {
        errLine = "❌ This user is not available right now.";
      } else if (e.message && e.message.includes("You can't add this person")) {
        errLine = "❌ You can't add this person to the group.";
      } else if (e.message && e.message.includes("not found")) {
        errLine = "❌ User not found.";
      } else if (e.message && e.message.includes("admin")) {
        errLine = "❌ Bot needs admin permission to add users.";
      }

      return api.sendMessage(errLine, threadID);
    }
  }
};