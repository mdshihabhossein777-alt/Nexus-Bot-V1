/**
 * commands/utility/out.js
 * NEXUS BOT V1 — Reply to /grouplist with /out <num> → leave that group
 * © 2026 Ariyan Shihab
 */

const fs = require("fs-extra");
const path = require("path");

/* ⚡ From commands/utility/ → up 2 levels to project root */
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const GP_STORE_FILE = path.join(DATA_DIR, "grouplist_store.json");
const GROUPS_FILE = path.join(DATA_DIR, "groups.json");

module.exports = {
  name: "out",
  aliases: ["leave", "leavegroup", "exit"],
  version: "2.0.0",
  role: 2,
  description: "Reply to /grouplist with /out <num> to leave that group",
  usage: "/out <number>  (reply to /grouplist message)",
  category: "utility",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, messageReply } = event;

    /* ⚡ Emoji reaction helper */
    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ⚡ Owner check */
    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) {
      react("⛔");
      return;
    }

    /* ⚡ Must reply to a message */
    if (!messageReply || !messageReply.messageID) {
      react("❓");
      return api.sendMessage("Reply to /grouplist message with /out <num>", threadID);
    }

    /* ⚡ Validate number */
    const num = parseInt(args[0]);
    if (!Number.isFinite(num) || num < 1) {
      react("❓");
      return api.sendMessage("Provide a valid number. Example: /out 3", threadID);
    }

    react("⏳");

    try {
      /* ═══ Load store ═══ */
      let store = {};
      try { store = fs.readJsonSync(GP_STORE_FILE) || {}; } catch (_) {}

      const entry = store[messageReply.messageID];

      if (!entry || !entry.groups || !entry.groups.length) {
        react("❌");
        return api.sendMessage("List expired or not found. Run /grouplist again.", threadID);
      }

      /* ═══ Find target group ═══ */
      const target = entry.groups.find((g) => g.idx === num);

      if (!target) {
        react("❌");
        return api.sendMessage(`Number ${num} is out of range (1-${entry.groups.length}).`, threadID);
      }

      const targetID = target.gid;
      const targetName = target.name;

      console.log(`[out] leaving group: ${targetName} (${targetID})`);

      /* ═══ Leave the group ═══ */
      const me = String(api.getCurrentUserID());

      await new Promise((resolve, reject) => {
        try {
          api.removeUserFromGroup(me, targetID, (err) => {
            if (err) return reject(new Error(err.error || err.message || "leave failed"));
            resolve();
          });
        } catch (e) {
          reject(e);
        }
      });

      /* ═══ Remove from groups.json ═══ */
      try {
        let groupsDB = fs.readJsonSync(GROUPS_FILE) || {};
        if (groupsDB[targetID]) {
          delete groupsDB[targetID];
          fs.writeJsonSync(GROUPS_FILE, groupsDB);
        }
      } catch (_) {}

      /* ═══ Remove from store ═══ */
      try {
        delete store[messageReply.messageID];
        fs.writeJsonSync(GP_STORE_FILE, store);
      } catch (_) {}

      react("✅");
      api.sendMessage(`✅ Left group: ${targetName}`, threadID);

    } catch (e) {
      console.error("[out] error:", e.message);

      let msg = "Failed to leave group.";
      if (e.message.includes("leave")) {
        msg = "Facebook rejected leave request. Try again later.";
      }

      react("❌");
      api.sendMessage(`❌ ${msg}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1 | Ariyan Shihab
