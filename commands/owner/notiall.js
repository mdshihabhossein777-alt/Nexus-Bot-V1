/**
 * commands/owner/notiall.js
 * NEXUS BOT V1 — Broadcast notification to all groups
 * © 2026 Ariyan Shihab
 */

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const os = require("os");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const GROUPS_FILE = path.join(DATA_DIR, "groups.json");

/* ⚡ Customize your owner name here */
const OWNER_NAME = "Ariyan Shihab";

module.exports = {
  name: "notiall",
  aliases: ["notifyall", "broadcast", "noti"],
  version: "2.0.0",
  role: 2,
  description: "Broadcast notification to all groups",
  usage: "/notiall <message>  (reply to image to send image)",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, messageReply } = event;

    /* ⚡ Reaction helper */
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

    /* ⚡ Message required */
    const msgBody = args.join(" ").trim();
    if (!msgBody && !messageReply) {
      react("❓");
      return api.sendMessage(
        "Usage: /notiall <message>\nReply to an image to send image too.",
        threadID
      );
    }

    /* ⚡ Load all groups */
    let groupsDB = {};
    try { groupsDB = fs.readJsonSync(GROUPS_FILE) || {}; } catch (_) {}

    const groupIDs = Object.keys(groupsDB);

    if (!groupIDs.length) {
      react("❌");
      return api.sendMessage("No groups found.", threadID);
    }

    react("⏳");
    api.sendMessage(`📢 Sending to ${groupIDs.length} groups...`, threadID);

    /* ═══ Build message ═══ */
    const lines = [];
    lines.push("🔔 NOTIFICATION FROM OWNER");
    lines.push(`👑 Owner: ${OWNER_NAME}`);
    lines.push("━━━━━━━━━━━━━━");
    if (msgBody) lines.push(msgBody);
    lines.push("━━━━━━━━━━━━━━");
    const finalText = lines.join("\n");

    /* ═══ Check for reply image ═══ */
    let imageBuffer = null;
    let imageExt = "jpg";

    if (messageReply && messageReply.attachments && messageReply.attachments.length) {
      const imgAtt = messageReply.attachments.find((a) =>
        a.type === "photo" ||
        (a.url && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(a.url)) ||
        a.mimeType?.startsWith("image/")
      );

      if (imgAtt && imgAtt.url) {
        try {
          console.log(`[notiall] downloading image: ${imgAtt.url.slice(0, 80)}`);
          const img = await axios.get(imgAtt.url, {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "image/*,*/*"
            },
            maxContentLength: 15 * 1024 * 1024
          });

          const buf = Buffer.from(img.data);
          if (buf.length > 2000) {
            imageBuffer = buf;

            /* Detect ext */
            if (buf[0] === 0xFF && buf[1] === 0xD8) imageExt = "jpg";
            else if (buf[0] === 0x89 && buf[1] === 0x50) imageExt = "png";
            else if (buf.slice(0, 4).toString() === "RIFF") imageExt = "webp";
            else if (buf.slice(0, 3).toString() === "GIF") imageExt = "gif";

            console.log(`[notiall] image: ${buf.length} bytes .${imageExt}`);
          }
        } catch (e) {
          console.warn("[notiall] image download failed:", e.message);
        }
      }
    }

    /* ═══ Broadcast with 3s delay ═══ */
    let success = 0;
    let failed = 0;

    for (let i = 0; i < groupIDs.length; i++) {
      const gid = groupIDs[i];

      try {
        let payload;

        if (imageBuffer) {
          /* Save temp file for stream */
          const tmpPath = path.join(os.tmpdir(), `notiall_${Date.now()}_${i}.${imageExt}`);
          await fs.writeFile(tmpPath, imageBuffer);

          payload = {
            body: finalText,
            attachment: fs.createReadStream(tmpPath)
          };

          await new Promise((resolve) => {
            api.sendMessage(payload, gid, (err) => {
              try { fs.unlinkSync(tmpPath); } catch (_) {}
              if (err) failed++; else success++;
              resolve();
            });
          });
        } else {
          await new Promise((resolve) => {
            api.sendMessage(finalText, gid, (err) => {
              if (err) failed++; else success++;
              resolve();
            });
          });
        }

        console.log(`[notiall] ${i + 1}/${groupIDs.length} → ${gid}`);

      } catch (e) {
        console.warn(`[notiall] failed for ${gid}:`, e.message);
        failed++;
      }

      /* ⚡ 3 second delay between groups (last group e delay nai) */
      if (i < groupIDs.length - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    react("✅");
    api.sendMessage(
      `✅ Notification sent\n📤 Success: ${success}\n❌ Failed: ${failed}\n📊 Total: ${groupIDs.length}`,
      threadID
    );
  }
};

// © 2026 NEXUS BOT V1 | Ariyan Shihab
