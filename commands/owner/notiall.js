/**
 * commands/owner/notiall.js
 * NEXUS BOT V1 — Themed broadcast with live progress + short summary
 * © 2026 Ariyan Shihab
 */

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const os = require("os");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const GROUPS_FILE = path.join(DATA_DIR, "groups.json");

/* ⚡ Customize your owner name */
const OWNER_NAME = "Ariyan Shihab";

module.exports = {
  name: "notiall",
  aliases: ["notifyall", "broadcast", "noti"],
  version: "3.1.0",
  role: 2,
  description: "Themed broadcast to all groups with live progress",
  usage: "/notiall <message>  (reply to image to send image)",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, messageReply } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) {
      react("⛔");
      return;
    }

    const msgBody = args.join(" ").trim();
    if (!msgBody && !messageReply) {
      react("❓");
      return api.sendMessage(
        "Usage: /notiall <message>\nReply to an image to send image too.",
        threadID
      );
    }

    let groupsDB = {};
    try { groupsDB = fs.readJsonSync(GROUPS_FILE) || {}; } catch (_) {}

    const groupIDs = Object.keys(groupsDB);

    if (!groupIDs.length) {
      react("❌");
      return api.sendMessage("No groups found.", threadID);
    }

    react("⏳");

    /* ═══ LIVE PROGRESS MESSAGE ═══ */
    const startMsg = await new Promise((resolve) => {
      api.sendMessage(
        `📢 BROADCAST STARTED\n━━━━━━━━━━━━━━━━━━━━\n👑 Owner: ${OWNER_NAME}\n📊 Total: ${groupIDs.length} groups\n⏳ Status: Sending...`,
        threadID,
        (err, info) => resolve(info)
      );
    });

    const progressMsgID = startMsg?.messageID || null;

    /* ═══ Build themed message ═══ */
    const lines = [];
    lines.push("╔══════════════════════════╗");
    lines.push("   🔔  NOTIFICATION  🔔");
    lines.push("╚══════════════════════════╝");
    lines.push("");
    lines.push(`👑 From: ${OWNER_NAME}`);
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("");
    if (msgBody) lines.push(msgBody);
    lines.push("");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("💎 NEXUS BOT V1");
    const finalText = lines.join("\n");

    /* ═══ Image handling ═══ */
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
            if (buf[0] === 0xFF && buf[1] === 0xD8) imageExt = "jpg";
            else if (buf[0] === 0x89 && buf[1] === 0x50) imageExt = "png";
            else if (buf.slice(0, 4).toString() === "RIFF") imageExt = "webp";
            else if (buf.slice(0, 3).toString() === "GIF") imageExt = "gif";
          }
        } catch (_) {}
      }
    }

    /* ═══ Broadcast ═══ */
    let success = 0;
    let failed = 0;

    /* Helper to update progress message */
    const updateProgress = async (idx) => {
      if (!progressMsgID) return;
      try {
        const filled = Math.floor((idx / groupIDs.length) * 10);
        const progressBar = "█".repeat(filled) + "░".repeat(10 - filled);
        const pct = Math.floor((idx / groupIDs.length) * 100);

        api.editMessage(
          `📢 BROADCAST IN PROGRESS\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `👑 Owner: ${OWNER_NAME}\n` +
          `📊 Progress: ${idx}/${groupIDs.length}\n` +
          `[${progressBar}] ${pct}%\n` +
          `✅ Sent: ${success}  ❌ Failed: ${failed}\n` +
          `⏳ Status: Sending...`,
          progressMsgID
        );
      } catch (_) {}
    };

    for (let i = 0; i < groupIDs.length; i++) {
      const gid = groupIDs[i];

      try {
        if (imageBuffer) {
          const tmpPath = path.join(os.tmpdir(), `notiall_${Date.now()}_${i}.${imageExt}`);
          await fs.writeFile(tmpPath, imageBuffer);

          await new Promise((resolve) => {
            api.sendMessage(
              { body: finalText, attachment: fs.createReadStream(tmpPath) },
              gid,
              (err) => {
                try { fs.unlinkSync(tmpPath); } catch (_) {}
                if (err) failed++;
                else success++;
                resolve();
              }
            );
          });
        } else {
          await new Promise((resolve) => {
            api.sendMessage(finalText, gid, (err) => {
              if (err) failed++;
              else success++;
              resolve();
            });
          });
        }

        console.log(`[notiall] ${i + 1}/${groupIDs.length} → ${gid}`);

      } catch (e) {
        console.warn(`[notiall] failed for ${gid}:`, e.message);
        failed++;
      }

      /* Update progress message */
      await updateProgress(i + 1);

      /* 3 sec delay (skip last) */
      if (i < groupIDs.length - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    /* ═══ FINAL SUMMARY (SHORT) ═══ */
    react("✅");

    const summaryText =
      `✅ Broadcast Done\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 Total: ${groupIDs.length}\n` +
      `✅ Success: ${success}\n` +
      `❌ Failed: ${failed}`;

    /* Unsend progress + send final summary */
    if (progressMsgID) {
      try { api.unsendMessage(progressMsgID, () => {}); } catch (_) {}
    }

    api.sendMessage(summaryText, threadID);
  }
};

// © 2026 NEXUS BOT V1 | Ariyan Shihab
