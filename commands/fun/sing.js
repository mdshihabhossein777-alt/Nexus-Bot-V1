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
  version: "8.1.0",
  role: 0,
  description: "Search and send full song",
  usage: "/sing <song name>",
  execute: async function (api, event, args, db, config) {
    const { threadID, senderID, messageID } = event;

    try {
      const query = args.join(" ").trim();
      if (!query) {
        return api.sendMessage(`🎵 Use: /sing <song name>`, threadID);
      }

      /* React ⏳ on search */
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

      /* React ✅ */
      if (messageID) await react(api, "✅", messageID, threadID);

      /* Clean list */
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

        /* ⚡ FIX: info ba info.messageID null hote pare Render e */
        const realMID = info && info.messageID ? String(info.messageID) : null;

        /* Fallback key — threadID + senderID based (unique per user per chat) */
        const fallbackKey = `fb_${threadID}_${senderID}`;
        const storeKey = realMID || fallbackKey;

        songSearches.set(storeKey, {
          results,
          threadID: String(threadID),
          senderID: String(senderID),
          time: Date.now()
        });

        console.log(`[sing] list stored: ${storeKey}${realMID ? "" : " (fallback)"}`);

        /* Auto-unsend at 30s — only if we have a real messageID */
        if (realMID) {
          const timer = setTimeout(() => {
            if (songSearches.has(realMID)) {
              api.unsendMessage(realMID, () => {});
              songSearches.delete(realMID);
              console.log(`[sing] auto-unsent: ${realMID}`);
            }
          }, 30000);

          const entry = songSearches.get(realMID);
          if (entry) entry.timer = timer;
        } else {
          /* Fallback: auto-cleanup after 60s (jodi user reply na kore) */
          const timer = setTimeout(() => {
            if (songSearches.has(fallbackKey)) {
              songSearches.delete(fallbackKey);
              console.log(`[sing] fallback auto-cleaned: ${fallbackKey}`);
            }
          }, 60000);
          const entry = songSearches.get(fallbackKey);
          if (entry) entry.timer = timer;
        }
      });

    } catch (e) {
      console.error("[sing] error:", e.message);
      if (messageID) await react(api, "❌", messageID, threadID);
    }
  }
};