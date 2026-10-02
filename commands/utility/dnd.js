// commands/utility/dnd.js - NEXUS V1 - DND Mode (Clean)
const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
fs.ensureDirSync(DATA_DIR);
const DND_FILE = path.join(DATA_DIR, "dnd.json");

function loadDND() {
  try { return fs.readJsonSync(DND_FILE) || {}; } catch (_) { return {}; }
}
function saveDND(d) {
  try { fs.writeJsonSync(DND_FILE, d); } catch (e) { console.error("[dnd]", e.message); }
}

module.exports = {
  name: "dnd",
  aliases: ["away", "brb", "donotdisturb", "busy"],
  version: "2.0.0",
  role: 0,
  description: "DND mode",
  usage: "/dnd <reason> | /dnd off | /dnd list | /dnd check",
  execute: async function (api, event, args, db, config) {
    const { threadID, senderID, mentions, messageReply } = event;

    try {
      const sub = (args[0] || "").toLowerCase();
      const data = loadDND();

      /* ═══════ /dnd off ═══════ */
      if (sub === "off" || sub === "stop" || sub === "end" || sub === "band") {
        if (data[senderID]) {
          const dur = Math.floor((Date.now() - data[senderID].since) / 1000);
          const mins = Math.floor(dur / 60);
          delete data[senderID];
          saveDND(data);
          return api.sendMessage(
            `🔔 DND OFF\n` +
            `⏱️ ${mins > 0 ? mins + " min" : dur + "s"}`,
            threadID
          );
        }
        return api.sendMessage(`ℹ️ Tumi DND mode e na.`, threadID);
      }

      /* ═══════ /dnd list ═══════ */
      if (sub === "list" || sub === "all") {
        const active = Object.entries(data);
        if (!active.length) return api.sendMessage(`📋 Keu DND mode e na.`, threadID);

        const lines = [`📋 DND LIST (${active.length})`];
        for (const [uid, info] of active.slice(0, 15)) {
          let name = uid;
          try {
            const ui = await api.getUserInfo(uid);
            if (ui && ui[uid] && ui[uid].name) name = ui[uid].name;
          } catch (_) {}

          const dur = Math.floor((Date.now() - info.since) / 1000);
          const mins = Math.floor(dur / 60);
          const timeStr = mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
          lines.push(`🔕 ${name} — ${info.reason} (${timeStr})`);
        }
        return api.sendMessage(lines.join("\n"), threadID);
      }

      /* ═══════ /dnd check ═══════ */
      if (sub === "check" || sub === "status") {
        let target = String(senderID);
        const ids = Object.keys(mentions || {});
        if (ids.length) target = String(ids[0]);
        else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);

        let name = target;
        try {
          const ui = await api.getUserInfo(target);
          if (ui && ui[target] && ui[target].name) name = ui[target].name;
        } catch (_) {}

        if (data[target]) {
          const dur = Math.floor((Date.now() - data[target].since) / 1000);
          const mins = Math.floor(dur / 60);
          return api.sendMessage(
            `🔕 ${name}\n📝 ${data[target].reason}\n⏱️ ${mins > 0 ? mins + " min" : dur + "s"} ago`,
            threadID
          );
        }
        return api.sendMessage(`✅ ${name} available.`, threadID);
      }

      /* ═══════ Already in DND ═══════ */
      if (data[senderID]) {
        const dur = Math.floor((Date.now() - data[senderID].since) / 1000);
        const mins = Math.floor(dur / 60);
        return api.sendMessage(
          `ℹ️ Tumi already DND e acho.\n` +
          `📝 ${data[senderID].reason}\n` +
          `⏱️ ${mins > 0 ? mins + " min" : dur + "s"} ago`,
          threadID
        );
      }

      /* ═══════ Turn ON ═══════ */
      const reason = args.join(" ").trim() || "Busy";
      data[senderID] = {
        reason: reason.slice(0, 100),
        since: Date.now(),
        threadID: String(threadID)
      };
      saveDND(data);

      let name = "User";
      try {
        const ui = await api.getUserInfo(senderID);
        if (ui && ui[senderID] && ui[senderID].name) name = ui[senderID].name;
      } catch (_) {}

      api.sendMessage(
        `🔕 DND ON\n` +
        `👤 ${name}\n` +
        `📝 ${reason}`,
        threadID
      );

    } catch (e) {
      api.sendMessage("❌ Error: " + e.message, threadID);
    }
  }
};