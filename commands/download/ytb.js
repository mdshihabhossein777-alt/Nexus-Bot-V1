/**
 * commands/download/ytb.js
 * NEXUS BOT V1 — YouTube download (video/audio/info)
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const yts = require("yt-search");
const ytbStore = require("../../utils/ytbStore");

/* ═══ Format number ═══ */
function formatNumber(n) {
  if (!n) return "0";
  n = Number(n);
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

/* ═══ Send list with one thumbnail ═══ */
async function sendListWithThumb(api, threadID, results, msg) {
  let thumbPath = null;
  try {
    const thumbUrl = results[0].thumbnail;
    const r = await axios.get(thumbUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
      maxContentLength: 5 * 1024 * 1024,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    thumbPath = path.join(os.tmpdir(), `ytb_thumb_${Date.now()}.jpg`);
    await fs.writeFile(thumbPath, Buffer.from(r.data));
    return await new Promise((resolve) => {
      api.sendMessage({
        body: msg,
        attachment: fs.createReadStream(thumbPath)
      }, threadID, (err, info) => {
        try { fs.unlinkSync(thumbPath); } catch (_) {}
        resolve(info);
      });
    });
  } catch (_) {
    return await new Promise((resolve) => {
      api.sendMessage(msg, threadID, (err, info) => resolve(info));
    });
  }
}

module.exports = {
  name: "ytb",
  aliases: ["yt", "youtube"],
  version: "1.0.0",
  role: 0,
  description: "YouTube video/audio downloader",
  usage: "/ytb [-v|-a|-i] <query>",
  category: "download",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, body, messageReply } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Parse type ═══ */
    let type = null;
    let query = "";

    if (args[0]) {
      const t = args[0].toLowerCase();
      if (["-v", "video", "vid"].includes(t)) { type = "video"; query = args.slice(1).join(" "); }
      else if (["-a", "-s", "audio", "sing", "song"].includes(t)) { type = "audio"; query = args.slice(1).join(" "); }
      else if (["-i", "info"].includes(t)) { type = "info"; query = args.slice(1).join(" "); }
    }

    /* Reply fallback */
    if (!query && messageReply && messageReply.body) {
      query = String(messageReply.body).trim();
    }

    if (!query && !type) {
      react("❓");
      return api.sendMessage(
        "🎬 YOUTUBE DOWNLOADER\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "📝 Usage:\n" +
        "  /ytb -a <song>   → Audio (MP3)\n" +
        "  /ytb -v <video>  → Video (MP4)\n" +
        "  /ytb -i <video>  → Info\n\n" +
        "💡 Example:\n" +
        "  /ytb -a tanvir evan\n" +
        "  /ytb -v naruto amv",
        threadID
      );
    }

    if (!query) {
      react("❓");
      return api.sendMessage("❌ Query dao: /ytb -a <song name>", threadID);
    }

    /* Default → audio */
    if (!type) type = "audio";

    react("⏳");
    console.log(`[ytb] search: "${query}" type=${type}`);

    try {
      /* ═══ Search YouTube ═══ */
      const search = await yts(query);
      const videos = (search?.videos || [])
        .filter((v) => v && v.videoId && v.seconds >= 30)
        .slice(0, 6);

      if (!videos.length) {
        react("❌");
        return api.sendMessage(`❌ "${query}" — kono result pai ni`, threadID);
      }

      /* ═══ If only one result and info requested → show directly ═══ */
      if (type === "info" && videos.length >= 1) {
        const v = videos[0];
        const hours = Math.floor(v.seconds / 3600);
        const mins = Math.floor((v.seconds % 3600) / 60);
        const secs = v.seconds % 60;
        const time = `${hours ? hours + ":" : ""}${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

        const infoMsg =
          "💠 VIDEO INFO\n" +
          "━━━━━━━━━━━━━━━━━━━━\n" +
          "📝 Title: " + v.title + "\n" +
          "🏪 Channel: " + (v.author?.name || "Unknown") + "\n" +
          "⏱ Duration: " + time + "\n" +
          "👀 Views: " + formatNumber(v.views || 0) + "\n" +
          "🆙 Uploaded: " + (v.ago || "Unknown") + "\n" +
          "🔗 Link: https://youtu.be/" + v.videoId;

        await sendListWithThumb(api, threadID, videos, infoMsg);
        react("✅");
        return;
      }

      /* ═══ Build list message ═══ */
      const lines = [];
      lines.push("🎬 YOUTUBE SEARCH");
      lines.push("━━━━━━━━━━━━━━━━━━━━");
      lines.push(`🔍 Query: ${query}`);
      lines.push(`📊 Mode: ${type === "audio" ? "🎵 Audio" : "📹 Video"}`);
      lines.push("");
      lines.push("👇 Reply with number (1-" + videos.length + ")");
      lines.push("");

      videos.forEach((v, i) => {
        lines.push(`${i + 1}. ${v.title.slice(0, 50)}`);
        lines.push(`   👤 ${(v.author?.name || "Unknown").slice(0, 25)}  ⏱ ${v.timestamp || "0:00"}`);
      });

      const listMsg = lines.join("\n");
      const sent = await sendListWithThumb(api, threadID, videos, listMsg);

      if (sent && sent.messageID) {
        ytbStore.set(String(sent.messageID), {
          results: videos,
          type,
          threadID: String(threadID),
          senderID: String(senderID),
          time: Date.now()
        });
        console.log(`[ytb] stored: ${sent.messageID}`);
      }

      react("✅");

    } catch (e) {
      console.error("[ytb] error:", e.message);
      react("❌");
      api.sendMessage("❌ " + e.message.slice(0, 80), threadID);
    }
  }
};