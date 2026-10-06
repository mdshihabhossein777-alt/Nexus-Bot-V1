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

/* ═══ Extract YouTube ID from URL ═══ */
function extractVideoId(text) {
  const m = String(text).match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/* ═══ Send list with one thumbnail ═══ */
async function sendListWithThumb(api, threadID, results, msg) {
  let thumbPath = null;
  try {
    const thumbUrl = results[0].thumbnail;
    if (!thumbUrl) throw new Error("no thumb");

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

/* ═══ Get video info from ID ═══ */
async function getVideoInfoFromId(videoId) {
  try {
    const r = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      timeout: 20000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    const html = r.data;
    const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/);
    const channelMatch = html.match(/"ownerChannelName":"([^"]+)"/);
    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
    const viewsMatch = html.match(/"viewCount":"(\d+)"/);

    return {
      videoId,
      title: titleMatch ? titleMatch[1] : "Unknown",
      author: { name: channelMatch ? channelMatch[1] : "Unknown" },
      seconds: durationMatch ? parseInt(durationMatch[1]) : 0,
      views: viewsMatch ? parseInt(viewsMatch[1]) : 0,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      timestamp: null,
      ago: null
    };
  } catch (_) {
    return {
      videoId,
      title: `YouTube Video (${videoId})`,
      author: { name: "Unknown" },
      seconds: 0,
      views: 0,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    };
  }
}

module.exports = {
  name: "ytb",
  aliases: ["yt", "youtube"],
  version: "1.1.0",
  role: 0,
  description: "YouTube video/audio downloader",
  usage: "/ytb [-v|-a|-i] <query | url>",
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

    /* ═══ Help ═══ */
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
        "  /ytb -v naruto amv\n" +
        "  /ytb -a https://youtu.be/xxxxx",
        threadID
      );
    }

    if (!query) {
      react("❓");
      return api.sendMessage("❌ Query dao: /ytb -a <song name>", threadID);
    }

    if (!type) type = "audio";

    react("⏳");
    console.log(`[ytb] search: "${query}" type=${type}`);

    try {
      /* ═══ Check if query is a URL ═══ */
      const directId = extractVideoId(query);
      let videos = [];

      if (directId) {
        /* ═══ URL mode — direct ═══ */
        console.log(`[ytb] URL detected: ${directId}`);
        const v = await getVideoInfoFromId(directId);
        videos = [v];
      } else {
        /* ═══ Search mode ═══ */
        const search = await yts(query);
        videos = (search?.videos || [])
          .filter((v) => v && v.videoId && v.seconds >= 30)
          .slice(0, 6);
      }

      if (!videos.length) {
        react("❌");
        return api.sendMessage(`❌ "${query}" — kono result pai ni`, threadID);
      }

      /* ═══ Info mode ═══ */
      if (type === "info") {
        const v = videos[0];
        const secs = v.seconds || 0;
        const hours = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        const time = `${hours ? hours + ":" : ""}${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

        const infoMsg =
          "💠 VIDEO INFO\n" +
          "━━━━━━━━━━━━━━━━━━━━\n" +
          "📝 Title: " + (v.title || "Unknown") + "\n" +
          "🏪 Channel: " + (v.author?.name || "Unknown") + "\n" +
          "⏱ Duration: " + time + "\n" +
          "👀 Views: " + formatNumber(v.views || 0) + "\n" +
          "🔗 Link: https://youtu.be/" + v.videoId;

        await sendListWithThumb(api, threadID, videos, infoMsg);
        react("✅");
        return;
      }

      /* ═══ Direct URL — skip list, download ═══ */
      if (directId) {
        console.log(`[ytb] direct download: ${directId}`);

        ytbStore.set(`direct_${threadID}_${senderID}`, {
          results: videos,
          type,
          threadID: String(threadID),
          senderID: String(senderID),
          time: Date.now()
        });

        /* Trigger download via triggers.js */
        const triggers = require("../../utils/triggers");
        if (typeof triggers.forceDownload === "function") {
          await triggers.forceDownload(api, event, videos[0], type);
        } else {
          /* Fallback — mimic reply */
          api.sendMessage("⏳ Downloading...", threadID);
        }
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
        lines.push(`${i + 1}. ${String(v.title).slice(0, 50)}`);
        lines.push(`   👤 ${String(v.author?.name || "Unknown").slice(0, 25)}  ⏱ ${v.timestamp || "0:00"}`);
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