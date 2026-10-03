// commands/fun/sing.js - NEXUS V1 - Song search + reactions
const yts = require("yt-search");
const songSearches = require("../../utils/songStore");

function react(api, emoji, messageID, threadID) {
  return new Promise((resolve) => {
    if (!messageID || !threadID) return resolve(false);
    try {
      api.setMessageReaction(emoji, messageID, threadID, (err) => resolve(!err));
    } catch (_) { resolve(false); }
  });
}

module.exports = {
  name: "sing",
  aliases: ["song", "music", "gaan", "gan"],
  version: "8.3.0",
  role: 0,
  description: "Search and send full song",
  usage: "/sing <song name>",
  category: "fun",

  execute: async function (api, event, args, db, config) {
    const { threadID, senderID, messageID } = event;

    try {
      const query = args.join(" ").trim();
      if (!query) {
        return api.sendMessage(`🎵 Use: /sing <song name>`, threadID);
      }

      if (messageID) await react(api, "⏳", messageID, threadID);
      console.log(`[sing] searching: "${query}"`);

      const search = await yts(query);
      const results = (search?.videos || [])
        .filter((v) => v && v.title && v.videoId && v.seconds >= 60)
        .slice(0, 10);

      if (!results.length) {
        if (messageID) await react(api, "❌", messageID, threadID);
        return api.sendMessage(`❌ "${query}" name e kono song pelam na.`, threadID);
      }

      if (messageID) await react(api, "✅", messageID, threadID);

      const lines = [`🎵 SONG LIST`, `━━━━━━━━━━━━━━━━━━`];
      results.forEach((s, i) => {
        const name = String(s.title).slice(0, 42);
        const author = String(s.author?.name || "Unknown").slice(0, 22);
        const dur = s.timestamp || "0:00";
        lines.push(`${i + 1}. ${name}`);
        lines.push(`   👤 ${author}  ⏱️ ${dur}`);
      });

      api.sendMessage(lines.join("\n"), threadID, (err, info) => {
        if (err) {
          console.error("[sing] send error:", err && err.message ? err.message : err);
          return;
        }

        const realMID = info && info.messageID ? String(info.messageID) : null;
        const fallbackKey = `fb_${threadID}_${senderID}`;
        const storeKey = realMID || fallbackKey;

        const storeData = {
          results,
          threadID: String(threadID),
          senderID: String(senderID),
          time: Date.now()
        };

        /* ⚡ Store under BOTH keys — real MID + fallback */
        songSearches.set(storeKey, storeData);
        if (realMID) {
          songSearches.set(fallbackKey, storeData);
        }

        console.log(`[sing] stored: ${storeKey} + fallback: ${fallbackKey}`);

        /* ⚡ Auto-unsend at 30s — but DON'T delete from store */
        if (realMID) {
          const timer = setTimeout(() => {
            if (songSearches.has(realMID)) {
              try { api.unsendMessage(realMID, () => {}); } catch (_) {}
              console.log(`[sing] unsent msg: ${realMID} (store kept)`);
            }
          }, 30000);
          const entry = songSearches.get(realMID);
          if (entry) entry.timer = timer;
        }

        /* ⚡ Separate cleanup timer — remove store after 5 min */
        const cleanupTimer = setTimeout(() => {
          if (songSearches.has(storeKey)) songSearches.delete(storeKey);
          if (songSearches.has(fallbackKey)) songSearches.delete(fallbackKey);
          console.log(`[sing] store cleanup: ${storeKey} + ${fallbackKey}`);
        }, 5 * 60 * 1000);

        const entryX = songSearches.get(storeKey);
        if (entryX) entryX.cleanupTimer = cleanupTimer;
      });

    } catch (e) {
      console.error("[sing] error:", e.message);
      if (messageID) await react(api, "❌", messageID, threadID);
    }
  }
};