// commands/utility/setdnd.js - NEXUS V1 - Custom DND Reply (Clean)
const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
fs.ensureDirSync(DATA_DIR);
const DND_FILE = path.join(DATA_DIR, "dnd.json");

function loadDND() {
  try { return fs.readJsonSync(DND_FILE) || {}; } catch (_) { return {}; }
}
function saveDND(d) {
  try { fs.writeJsonSync(DND_FILE, d); } catch (e) { console.error("[setdnd]", e.message); }
}

const DEFAULT_REPLY =
  `🔕 DND MODE\n` +
  `👤 {name} ekhon available na.\n` +
  `📝 Reason: {reason}\n` +
  `⏱️ {time} ago`;

module.exports = {
  name: "setdnd",
  aliases: ["dndmsg", "setaway", "customdnd"],
  version: "2.0.0",
  role: 0,
  description: "Custom DND reply message",
  usage: "/setdnd <message> | show | default | preview",
  execute: async function (api, event, args, db, config) {
    const { threadID, senderID } = event;

    try {
      const sub = (args[0] || "").toLowerCase();
      const data = loadDND();

      /* ═══════ No args — help ═══════ */
      if (!args.length) {
        return api.sendMessage(
          `📝 /setdnd <message>\n` +
          `👁️ /setdnd show\n` +
          `🔄 /setdnd default\n` +
          `🧪 /setdnd preview\n\n` +
          `Placeholders:\n` +
          `  {name}   → name\n` +
          `  {reason} → reason\n` +
          `  {time}   → duration\n` +
          `  {user}   → mention korlo ke`,
          threadID
        );
      }

      /* ═══════ show ═══════ */
      if (sub === "show" || sub === "view") {
        const current = (data[senderID] && data[senderID].customReply) || DEFAULT_REPLY;
        return api.sendMessage(current, threadID);
      }

      /* ═══════ default ═══════ */
      if (sub === "default" || sub === "reset") {
        if (!data[senderID]) data[senderID] = {};
        delete data[senderID].customReply;
        saveDND(data);
        return api.sendMessage(`✅ Reset done.`, threadID);
      }

      /* ═══════ preview ═══════ */
      if (sub === "preview" || sub === "test") {
        const custom = (data[senderID] && data[senderID].customReply) || DEFAULT_REPLY;

        let yourName = "You";
        try {
          const ui = await api.getUserInfo(senderID);
          if (ui && ui[senderID] && ui[senderID].name) yourName = ui[senderID].name;
        } catch (_) {}

        const preview = custom
          .replace(/{name}/g, yourName)
          .replace(/{reason}/g, "Kaj e busy")
          .replace(/{time}/g, "12m")
          .replace(/{user}/g, "Keu ekjon");

        return api.sendMessage(preview, threadID);
      }

      /* ═══════ Set custom message ═══════ */
      const customMessage = args.join(" ").trim();

      if (customMessage.length < 5) {
        return api.sendMessage("⚠️ Min 5 chars.", threadID);
      }
      if (customMessage.length > 500) {
        return api.sendMessage("⚠️ Max 500 chars.", threadID);
      }

      if (!data[senderID]) data[senderID] = {};
      data[senderID].customReply = customMessage;
      saveDND(data);

      api.sendMessage(`✅ Save hoyeche.`, threadID);

    } catch (e) {
      api.sendMessage("❌ Error: " + e.message, threadID);
    }
  }
};