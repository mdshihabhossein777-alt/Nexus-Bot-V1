/**
 * commands/cloud/s.js
 * NEXUS BOT V1 — Save media to cloud (Catbox)
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const FormData = require("form-data");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
fs.ensureDirSync(DATA_DIR);
const CLOUD_FILE = path.join(DATA_DIR, "cloud.json");

function loadCloud() {
  try { return fs.readJsonSync(CLOUD_FILE) || {}; } catch (_) { return {}; }
}
function saveCloud(d) {
  try { fs.writeJsonSync(CLOUD_FILE, d); } catch (e) { console.error("[cloud]", e.message); }
}

/* ═══ Upload to Catbox.moe ═══ */
async function uploadToCatbox(filePath) {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", fs.createReadStream(filePath));

  const r = await axios.post("https://catbox.moe/user/api.php", form, {
    headers: form.getHeaders(),
    timeout: 120000,
    maxContentLength: 250 * 1024 * 1024,
    maxBodyLength: 250 * 1024 * 1024
  });

  const url = String(r.data).trim();
  if (!url.startsWith("http")) throw new Error("upload failed: " + url.slice(0, 80));
  return url;
}

/* ═══ Detect media type ═══ */
function getMediaType(attachment, url) {
  const mime = (attachment.mimeType || "").toLowerCase();
  const ext = (url.match(/\.(jpg|jpeg|png|gif|mp4|mov|webm|mp3|wav|m4a|ogg)(\?|$)/i) || [])[1];
  const lowerExt = ext ? ext.toLowerCase() : "";

  if (mime.startsWith("image/gif") || lowerExt === "gif") return "gif";
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png"].includes(lowerExt)) return "image";
  if (mime.startsWith("video/") || ["mp4", "mov", "webm"].includes(lowerExt)) return "video";
  if (mime.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg"].includes(lowerExt)) return "audio";

  /* Fallback by attachment type */
  if (attachment.type === "photo") return "image";
  if (attachment.type === "video") return "video";
  if (attachment.type === "audio") return "audio";
  if (attachment.type === "animated_image") return "gif";

  return "file";
}

/* ═══ Generate next name ═══ */
function nextName(cloud, prefix) {
  let n = 1;
  while (cloud[`${prefix}${n}`]) n++;
  return `${prefix}${n}`;
}

module.exports = {
  name: "s",
  aliases: ["save", "savecloud"],
  version: "1.0.0",
  role: 2,
  description: "Save media to cloud storage",
  usage: "S  (reply to image/gif/video)",
  category: "cloud",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, messageReply, body } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* Owner check */
    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) { react("⛔"); return; }

    /* Reply check */
    if (!messageReply || !messageReply.attachments || !messageReply.attachments.length) {
      react("❓");
      return api.sendMessage(
        "📝 Usage:\n" +
        "1. Send an image/gif/video to bot\n" +
        "2. Reply to that message\n" +
        "3. Send: S\n" +
        "Or with custom name: S myname",
        threadID
      );
    }

    const attach = messageReply.attachments.find((a) =>
      a.type === "photo" || a.type === "video" || a.type === "animated_image" ||
      a.type === "audio" ||
      (a.url && /\.(jpg|jpeg|png|gif|mp4|mov|webm|mp3|wav|m4a|ogg)(\?|$)/i.test(a.url)) ||
      (a.mimeType && (a.mimeType.startsWith("image/") || a.mimeType.startsWith("video/") || a.mimeType.startsWith("audio/")))
    );

    if (!attach || !attach.url) {
      react("❌");
      return api.sendMessage("❌ No media found in reply", threadID);
    }

    react("⏳");

    let tmp = null;

    try {
      /* ═══ Download media ═══ */
      const dl = await axios.get(attach.url, {
        responseType: "arraybuffer",
        timeout: 120000,
        maxContentLength: 250 * 1024 * 1024,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const buf = Buffer.from(dl.data);
      if (buf.length < 100) throw new Error("file too small");
      if (buf.length > 200 * 1024 * 1024) throw new Error("file >200MB");

      /* ═══ Detect type + extension ═══ */
      const mediaType = getMediaType(attach, attach.url);
      let ext = "bin";
      if (buf[0] === 0xFF && buf[1] === 0xD8) ext = "jpg";
      else if (buf[0] === 0x89 && buf[1] === 0x50) ext = "png";
      else if (buf.slice(0, 4).toString() === "RIFF") ext = "webp";
      else if (buf.slice(0, 3).toString() === "GIF") ext = "gif";
      else if (buf.slice(4, 8).toString() === "ftyp") ext = "mp4";
      else if (buf.slice(0, 4).toString() === "OggS") ext = "ogg";
      else if (buf.slice(0, 3).toString() === "ID3") ext = "mp3";
      else {
        const m = attach.url.match(/\.(jpg|jpeg|png|gif|mp4|mov|webm|mp3|wav|m4a|ogg)/i);
        if (m) ext = m[1].toLowerCase();
      }

      /* ═══ Save temp file ═══ */
      tmp = path.join(os.tmpdir(), `cloud_${Date.now()}.${ext}`);
      await fs.writeFile(tmp, buf);

      /* ═══ Upload to Catbox ═══ */
      console.log(`[cloud] uploading ${(buf.length / 1024).toFixed(0)} KB .${ext}`);
      const url = await uploadToCatbox(tmp);
      console.log(`[cloud] uploaded: ${url}`);

      /* ═══ Determine name ═══ */
      const cloud = loadCloud();
      const uid = String(senderID);
      if (!cloud[uid]) cloud[uid] = {};

      let name;
      /* Custom name from args or "S myname" */
      const argText = (args.join(" ") || "").trim();
      const fromBody = (body || "").replace(/^S\s*/i, "").trim();
      const customName = argText || fromBody;

      if (customName && /^[a-zA-Z0-9_-]{1,30}$/.test(customName)) {
        name = customName;
      } else {
        /* Auto-generate: img1, vid1, gif1, etc. */
        const prefixMap = { image: "img", video: "vid", gif: "gif", audio: "aud", file: "file" };
        name = nextName(cloud[uid], prefixMap[mediaType] || "file");
      }

      /* Check if name taken */
      if (cloud[uid][name]) {
        react("❌");
        try { fs.unlinkSync(tmp); } catch (_) {}
        return api.sendMessage(`❌ Name "${name}" already exists. Use different name.`, threadID);
      }

      /* ═══ Save to cloud.json ═══ */
      cloud[uid][name] = {
        name,
        type: mediaType,
        url,
        size: buf.length,
        ext,
        savedAt: Date.now()
      };
      saveCloud(cloud);

      try { fs.unlinkSync(tmp); } catch (_) {}

      react("✅");
      return api.sendMessage(
        `☁️ SAVED TO CLOUD\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📛 Name: **${name}**\n` +
        `📁 Type: ${mediaType}\n` +
        `📊 Size: ${(buf.length / 1024).toFixed(1)} KB\n` +
        `🔗 ${url}\n\n` +
        `💡 Retrieve: /get ${name}`,
        threadID
      );

    } catch (e) {
      console.error("[cloud/s] error:", e.message);
      if (tmp) { try { fs.unlinkSync(tmp); } catch (_) {} }
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 80)}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1