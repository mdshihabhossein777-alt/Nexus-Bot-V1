
/**
 * commands/owner/setprofile.js
 * NEXUS BOT V1 — Set bot profile picture from replied image
 * Reply to any image + /setprofile → bot profile pic update
 * © 2026 Ariyan Shihab
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

module.exports = {
  name: "setprofile",
  aliases: ["setavatar", "setpfp", "botpfp", "setbotpic"],
  version: "2.1.0",
  role: 2,
  description: "Reply to an image → set as bot's profile picture",
  usage: "/setprofile (reply to an image)",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, messageReply, senderID } = event;

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
    if (!messageReply) {
      react("❓");
      return api.sendMessage("Reply to an image with /setprofile", threadID);
    }

    react("⏳");

    try {
      /* ═══ STEP 1 — Find image in replied message ═══ */
      const attachments = messageReply.attachments || [];

      if (!attachments.length) {
        react("❌");
        return api.sendMessage("No attachment found in replied message.", threadID);
      }

      const imgAtt = attachments.find((a) =>
        a.type === "photo" ||
        a.type === "sticker" ||
        (a.url && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(a.url)) ||
        a.mimeType?.startsWith("image/")
      );

      if (!imgAtt || !imgAtt.url) {
        react("❌");
        return api.sendMessage("No image found. Reply to a photo message.", threadID);
      }

      const imgUrl = imgAtt.url;
      console.log(`[setprofile] downloading: ${imgUrl.slice(0, 80)}...`);

      /* ═══ STEP 2 — Download image ═══ */
      const img = await axios.get(imgUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "image/*,*/*"
        },
        maxContentLength: 15 * 1024 * 1024
      });

      const buf = Buffer.from(img.data);
      if (buf.length < 2000) throw new Error("Image too small / empty");

      /* ═══ STEP 3 — Magic bytes detection ═══ */
      let ext = "jpg";
      if (buf[0] === 0xFF && buf[1] === 0xD8) ext = "jpg";
      else if (buf[0] === 0x89 && buf[1] === 0x50) ext = "png";
      else if (buf.slice(0, 4).toString() === "RIFF") ext = "webp";
      else if (buf.slice(0, 3).toString() === "GIF") ext = "gif";

      /* ═══ STEP 4 — Save temp file ═══ */
      const tmpPath = path.join(os.tmpdir(), `nexus_pfp_${Date.now()}.${ext}`);
      await fs.writeFile(tmpPath, buf);
      console.log(`[setprofile] saved: ${buf.length} bytes .${ext}`);

      /* ═══ STEP 5 — Set bot avatar ═══ */
      if (typeof api.changeAvatar !== "function") {
        throw new Error("changeAvatar not available");
      }

      const stream = fs.createReadStream(tmpPath);

      await new Promise((resolve, reject) => {
        try {
          api.changeAvatar(stream, (err, res) => {
            try { fs.unlinkSync(tmpPath); } catch (_) {}
            if (err) return reject(new Error(err.error || err.message || "changeAvatar failed"));
            resolve(res);
          });
        } catch (e) {
          try { fs.unlinkSync(tmpPath); } catch (_) {}
          reject(e);
        }
      });

      react("✅");
      return api.sendMessage(
        `✅ Bot profile picture updated\n` +
        `📁 Format: .${ext} (${(buf.length / 1024).toFixed(1)} KB)\n` +
        `⏱️ Refresh in 1-2 minutes`,
        threadID
      );

    } catch (e) {
      console.error("[setprofile] error:", e.message);

      /* Cleanup orphan temp files */
      try {
        const tmpDir = os.tmpdir();
        const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith("nexus_pfp_"));
        for (const f of files) {
          try { fs.unlinkSync(path.join(tmpDir, f)); } catch (_) {}
        }
      } catch (_) {}

      react("❌");

      let errMsg = e.message;
      if (errMsg.includes("changeAvatar")) {
        errMsg = "Facebook rejected the change. Try a smaller clear image.";
      } else if (errMsg.includes("timeout")) {
        errMsg = "Download timeout. Try again.";
      } else if (errMsg.includes("too small")) {
        errMsg = "Image is empty. Try another one.";
      }

      return api.sendMessage(`❌ Failed: ${errMsg}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1 | Ariyan Shihab
