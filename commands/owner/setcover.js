/**
 * commands/owner/setcover.js
 * NEXUS BOT V1 — Set bot cover photo (multi-method)
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

module.exports = {
  name: "setcover",
  aliases: ["setcoverphoto", "botcover", "coverphoto"],
  version: "2.0.0",
  role: 2,
  description: "Reply to an image → set as bot's cover photo",
  usage: "/setcover (reply to an image)",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, messageReply, senderID } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* Owner check */
    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) { react("⛔"); return; }

    /* Reply check */
    if (!messageReply) {
      react("❓");
      return api.sendMessage("Reply to an image with /setcover", threadID);
    }

    react("⏳");

    let tmpPath = null;

    try {
      /* ═══ Find image attachment ═══ */
      const attachments = messageReply.attachments || [];
      console.log(`[setcover] attachments: ${attachments.length}`);

      if (!attachments.length) {
        react("❌");
        return api.sendMessage("No attachment in replied message.", threadID);
      }

      const imgAtt = attachments.find((a) =>
        a.type === "photo" ||
        (a.url && /\.(jpg|jpeg|png|webp)/i.test(a.url)) ||
        (a.mimeType && a.mimeType.startsWith("image/"))
      );

      if (!imgAtt || !imgAtt.url) {
        react("❌");
        return api.sendMessage("No image found in reply.", threadID);
      }

      const imgUrl = imgAtt.url;
      console.log(`[setcover] url: ${imgUrl.slice(0, 80)}`);

      /* ═══ Download image ═══ */
      const img = await axios.get(imgUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
        maxContentLength: 20 * 1024 * 1024,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "image/*,*/*"
        }
      });

      const buf = Buffer.from(img.data);
      if (buf.length < 2000) throw new Error("image too small");

      /* Format detect */
      let ext = "jpg";
      if (buf[0] === 0xFF && buf[1] === 0xD8) ext = "jpg";
      else if (buf[0] === 0x89 && buf[1] === 0x50) ext = "png";
      else if (buf.slice(0, 4).toString() === "RIFF") ext = "webp";

      tmpPath = path.join(os.tmpdir(), `nexus_cover_${Date.now()}.${ext}`);
      await fs.writeFile(tmpPath, buf);
      console.log(`[setcover] saved: ${(buf.length / 1024).toFixed(1)} KB .${ext}`);

      /* ═══ DEBUG: List available methods ═══ */
      const allMethods = Object.keys(api).filter((k) => /cover|avatar|profile|photo/i.test(k));
      console.log(`[setcover] available methods: ${allMethods.join(", ") || "NONE"}`);

      /* ═══ Try multiple method names ═══ */
      const methodNames = [
        "changeCover",
        "changeCoverPhoto",
        "changeCoverImage",
        "setCover",
        "updateCover"
      ];

      let methodFound = null;
      for (const m of methodNames) {
        if (typeof api[m] === "function") {
          methodFound = m;
          break;
        }
      }

      /* ═══ Method found — use it ═══ */
      if (methodFound) {
        console.log(`[setcover] using: api.${methodFound}`);

        const stream = fs.createReadStream(tmpPath);

        await new Promise((resolve, reject) => {
          try {
            api[methodFound](stream, (err, res) => {
              try { fs.unlinkSync(tmpPath); } catch (_) {}
              if (err) return reject(new Error(err.error || err.message || "failed"));
              resolve(res);
            });
          } catch (e) {
            try { fs.unlinkSync(tmpPath); } catch (_) {}
            reject(e);
          }
        });

        react("✅");
        return api.sendMessage(
          `✅ Cover photo updated\n📁 .${ext} (${(buf.length / 1024).toFixed(1)} KB)\n⏱️ Refresh in 1-2 min`,
          threadID
        );
      }

      /* ═══ Fallback: Graph API via api.httpPost ═══ */
      if (typeof api.httpPost === "function") {
        console.log(`[setcover] trying Graph API fallback`);

        const stream = fs.createReadStream(tmpPath);

        await new Promise((resolve, reject) => {
          try {
            api.httpPost(
              "https://graph.facebook.com/me/cover",
              { source: stream },
              (err, res) => {
                try { fs.unlinkSync(tmpPath); } catch (_) {}
                if (err) return reject(new Error(err.error || err.message || "graph failed"));
                resolve(res);
              }
            );
          } catch (e) {
            try { fs.unlinkSync(tmpPath); } catch (_) {}
            reject(e);
          }
        });

        react("✅");
        return api.sendMessage(`✅ Cover updated via Graph API`, threadID);
      }

      /* ═══ No method available ═══ */
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      react("❌");
      return api.sendMessage(
        `❌ This FCA version does not support cover change.\n` +
        `Available: ${allMethods.join(", ") || "none"}`,
        threadID
      );

    } catch (e) {
      console.error("[setcover] error:", e.message);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }

      react("❌");

      let errMsg = e.message.slice(0, 100);
      if (errMsg.includes("timeout")) errMsg = "Download timeout. Try again.";
      else if (errMsg.includes("too small")) errMsg = "Image too small. Try another.";

      return api.sendMessage(`❌ ${errMsg}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1