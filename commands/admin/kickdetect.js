/**
 * commands/admin/kickdetect.js
 * NEXUS BOT V1 — Admin kick detector (sends GIF + text)
 * © 2026
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const assets = require("../../utils/assets");

const GIF_NAME = "kick.gif";

module.exports = {
  name: "kickdetect",
  aliases: [],
  version: "1.0.0",
  role: 0,
  description: "Internal — detects admin kick events",
  category: "admin",
  hidden: true,

  /* ⚡ Called from index.js handleEvent */
  handleKick: async function (api, event, db, config) {
    const { threadID, logMessageData } = event;

    try {
      /* ═══ Extract kick info ═══ */
      const leftID = String((logMessageData && logMessageData.leftParticipantFbId) || "");
      const kickerID = String((logMessageData && logMessageData.author) || "");

      if (!leftID) return false;

      /* ═══ Skip if bot itself was kicked ═══ */
      const botID = String(api.getCurrentUserID());
      if (leftID === botID) {
        console.log(`[kick] bot itself was removed from ${threadID}`);
        return false;
      }

      /* ═══ Skip if no kicker (voluntary leave) ═══ */
      if (!kickerID || kickerID === "0") {
        console.log(`[kick] ${leftID} left voluntarily`);
        return false;
      }

      /* ═══ Skip if kicker is the user themselves ═══ */
      if (kickerID === leftID) {
        console.log(`[kick] ${leftID} left voluntarily (self)`);
        return false;
      }

      console.log(`[kick] ${kickerID} kicked ${leftID} from ${threadID}`);

      /* ═══ Get names ═══ */
      let kickedName = "Someone";
      let kickerName = "Admin";

      try {
        const info = await api.getUserInfo([leftID, kickerID]);
        if (info && info[leftID] && info[leftID].name) kickedName = info[leftID].name;
        if (info && info[kickerID] && info[kickerID].name) kickerName = info[kickerID].name;
      } catch (_) {}

      /* ═══ Short text ═══ */
      const shortText = `🥾 ${kickedName} got kicked by ${kickerName}`;

      /* ═══ Load GIF from assets ═══ */
      let gifBuf = null;
      try {
        gifBuf = await assets.loadAsset(GIF_NAME);
        if (gifBuf) {
          console.log(`[kick] GIF loaded: ${(gifBuf.length / 1024).toFixed(0)} KB`);
        } else {
          console.log(`[kick] GIF not found: ${GIF_NAME}`);
        }
      } catch (e) {
        console.log(`[kick] GIF error: ${e.message.slice(0, 60)}`);
      }

      /* ═══ Send GIF + text ═══ */
      if (gifBuf) {
        const tmpPath = path.join(os.tmpdir(), `kick_${Date.now()}.gif`);
        await fs.writeFile(tmpPath, gifBuf);

        api.sendMessage({
          body: shortText,
          mentions: [{ tag: kickedName, id: leftID }],
          attachment: fs.createReadStream(tmpPath)
        }, threadID, () => {
          try { fs.unlinkSync(tmpPath); } catch (_) {}
        });
      } else {
        /* Fallback — text only */
        api.sendMessage(shortText, threadID, {
          mentions: [{ tag: kickedName, id: leftID }]
        });
      }

      return true;

    } catch (e) {
      console.error("[kick] error:", e.message);
      return false;
    }
  }
};