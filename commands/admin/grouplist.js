/**
 * commands/admin/grouplist.js
 * NEXUS BOT V1 — List all groups bot is in (names only)
 * © 2026 Ariyan Shihab
 */

const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const GROUPS_FILE = path.join(DATA_DIR, "groups.json");
const GP_STORE_FILE = path.join(DATA_DIR, "grouplist_store.json");

module.exports = {
  name: "grouplist",
  aliases: ["gplist", "groups", "glist"],
  version: "2.0.0",
  role: 2,
  description: "List all groups the bot is currently in",
  usage: "/grouplist",
  category: "admin",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* Owner check */
    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) {
      react("⛔");
      return;
    }

    react("⏳");

    try {
      /* ═══ Load groups DB ═══ */
      let groupsDB = {};
      try { groupsDB = fs.readJsonSync(GROUPS_FILE) || {}; } catch (_) {}

      const groupIDs = Object.keys(groupsDB);

      if (!groupIDs.length) {
        react("❌");
        return api.sendMessage("No groups found in database.", threadID);
      }

      /* ═══ Fetch names ═══ */
      const list = [];
      let idx = 1;

      for (const gid of groupIDs) {
        let name = groupsDB[gid]?.name || "";

        if (!name || name.trim() === "") {
          try {
            const info = await api.getThreadInfo(gid);
            name = info?.threadName || "Unnamed Group";
            if (groupsDB[gid]) groupsDB[gid].name = name;
          } catch (_) {
            name = "Unknown Group";
          }
        }

        list.push({ idx, gid: String(gid), name });
        idx++;
      }

      try { fs.writeJsonSync(GROUPS_FILE, groupsDB); } catch (_) {}

      /* ═══ Build message ═══ */
      const lines = [];
      lines.push("📋 BOT GROUP LIST");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━");
      lines.push(`📊 Total: ${list.length} groups\n`);

      for (const item of list) {
        lines.push(`${item.idx}. ${item.name}`);
      }

      lines.push("");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("💡 Reply to this message with:");
      lines.push("👉 /out <number>  →  bot leaves that group");

      /* ═══ Send + store mapping ═══ */
      api.sendMessage(lines.join("\n"), threadID, (err, info) => {
        if (err || !info || !info.messageID) {
          react("❌");
          return;
        }

        let store = {};
        try { store = fs.readJsonSync(GP_STORE_FILE) || {}; } catch (_) {}

        /* Cleanup old (> 10 min) */
        const now = Date.now();
        for (const k of Object.keys(store)) {
          if (now - (store[k].time || 0) > 10 * 60 * 1000) delete store[k];
        }

        store[info.messageID] = {
          groups: list,
          threadID: String(threadID),
          time: now
        };

        try { fs.writeJsonSync(GP_STORE_FILE, store); } catch (_) {}

        console.log(`[grouplist] stored ${list.length} groups under ${info.messageID}`);

        /* Auto-cleanup after 5 min */
        setTimeout(() => {
          try {
            let s = fs.readJsonSync(GP_STORE_FILE) || {};
            if (s[info.messageID]) {
              delete s[info.messageID];
              fs.writeJsonSync(GP_STORE_FILE, s);
            }
          } catch (_) {}
        }, 5 * 60 * 1000);
      });

      react("✅");

    } catch (e) {
      console.error("[grouplist] error:", e.message);
      react("❌");
      api.sendMessage("Failed to fetch group list.", threadID);
    }
  }
};

// © 2026 NEXUS BOT V1 | Ariyan Shihab
