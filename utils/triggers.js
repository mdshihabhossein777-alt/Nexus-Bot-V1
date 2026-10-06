/**
 * utils/triggers.js
 * NEXUS BOT V1 — Universal trigger registry + YTB handler
 * © 2026
 */

"use strict";

/**
 * Check all loaded commands for trigger matches.
 * Called from index.js at startup.
 */
async function checkTriggers(api, event, db, config, commands, body, senderID) {
  const trimmed = (body || "").trim();

  /* ═══════════════════════════════════════════════════════════
     YTB REPLY HANDLER — number reply diye YouTube download
     ═══════════════════════════════════════════════════════════ */
  if (event.messageReply && event.messageReply.messageID && trimmed) {
    try {
      const ytbStore = require("./ytbStore");
      const num = parseInt(trimmed);
      const entry = ytbStore.get(String(event.messageReply.messageID));

      if (entry && Number.isFinite(num) && num >= 1 && num <= entry.results.length) {
        const video = entry.results[num - 1];
        const threadID = event.threadID;
        const messageID = event.messageID;
        const senderIDstr = String(event.senderID || senderID);

        if (messageID) try { api.setMessageReaction("⏳", messageID, threadID, () => {}); } catch (_) {}

        ytbStore.delete(String(event.messageReply.messageID));

        console.log(`[ytb-reply] ${entry.type} → ${video.title}`);

        const fs = require("fs-extra");
        const path = require("path");
        const os = require("os");

        try {
          const { YtDlp } = require("ytdlp-nodejs");
          const ytdlp = new YtDlp();
          const url = `https://www.youtube.com/watch?v=${video.videoId}`;

          /* Cookie path resolve */
          const cookieCandidates = [
            path.join(__dirname, "..", "cookies.txt"),
            "/opt/render/project/src/cookies.txt",
            "/app/cookies.txt",
            path.join(process.cwd(), "cookies.txt"),
            path.join(os.tmpdir(), "yt-cookies.txt")
          ];

          let cookiesPath = null;
          for (const c of cookieCandidates) {
            try { if (fs.existsSync(c)) { cookiesPath = c; break; } } catch (_) {}
          }

          if (!cookiesPath && process.env.YT_COOKIES_B64) {
            try {
              const decoded = Buffer.from(process.env.YT_COOKIES_B64, "base64").toString("utf8");
              const tmp = path.join(os.tmpdir(), "yt-cookies.txt");
              fs.writeFileSync(tmp, decoded);
              cookiesPath = tmp;
            } catch (_) {}
          }

          const ext = entry.type === "video" ? "mp4" : "mp3";
          const tmpPath = path.join(os.tmpdir(), `ytb_${Date.now()}.${ext}`);

          const opts = {
            output: tmpPath,
            noWarnings: true,
            noProgress: true,
            retries: 3,
            extractorArgs: "youtube:player_client=android,ios,web_safari"
          };
          if (cookiesPath) opts.cookies = cookiesPath;

          let result;
          if (entry.type === "video") {
            opts.videoQuality = "720";
            result = await ytdlp.downloadVideo(url, "mp4", opts);
          } else {
            opts.audioQuality = "0";
            result = await ytdlp.downloadAudio(url, "mp3", opts);
          }

          let finalPath = null;
          if (result && result.filePaths && result.filePaths.length) {
            finalPath = result.filePaths[0];
          } else if (fs.existsSync(tmpPath)) {
            finalPath = tmpPath;
          }

          if (!finalPath || !fs.existsSync(finalPath)) {
            throw new Error("Download failed");
          }

          const stat = await fs.stat(finalPath);
          console.log(`[ytb-reply] downloaded: ${stat.size} bytes`);
          if (stat.size < 30000) throw new Error("File too small");

          api.sendMessage({
            body: "🎬 " + video.title,
            attachment: fs.createReadStream(finalPath)
          }, threadID, (err) => {
            if (!err && messageID) {
              try { api.setMessageReaction("✅", messageID, threadID, () => {}); } catch (_) {}
            }
            try { fs.unlinkSync(finalPath); } catch (_) {}
          });

          return true;

        } catch (e) {
          console.error("[ytb-reply] error:", e.message);
          if (messageID) try { api.setMessageReaction("❌", messageID, threadID, () => {}); } catch (_) {}
          api.sendMessage("❌ Download fail: " + e.message.slice(0, 60), threadID);
          return true;
        }
      }
    } catch (e) {
      console.error("[ytb-trigger] error:", e.message);
    }
  }

  if (!trimmed) return false;

  /* ═══ 1. REACTION TRIGGERS ═══ */
  if (event.type === "message_reaction") {
    const reaction = event.reaction || "";
    if (!reaction) return false;

    for (const [key, cmd] of commands) {
      if (!cmd.triggers || !cmd.triggers.react) continue;
      if (!Array.isArray(cmd.triggers.react)) continue;
      if (cmd.triggers.react.includes(reaction)) {
        try {
          if (typeof cmd.handleReaction === "function") {
            await cmd.handleReaction(api, event, db, config);
            return true;
          } else if (typeof cmd.execute === "function") {
            await cmd.execute(api, event, [], db, config, { prefix: config.prefix, commands });
            return true;
          }
        } catch (e) {
          console.log(`[trigger-react] ${cmd.name}: ${e.message}`);
        }
        return true;
      }
    }
    return false;
  }

  /* ═══ 2. REPLY TRIGGERS ═══ */
  if (event.messageReply && event.messageReply.messageID) {
    const lower = trimmed.toLowerCase();

    for (const [key, cmd] of commands) {
      if (!cmd.triggers || !cmd.triggers.reply) continue;
      if (!Array.isArray(cmd.triggers.reply)) continue;

      const matched = cmd.triggers.reply.some((t) => {
        const lt = String(t).toLowerCase();
        return lower === lt || lower.startsWith(lt + " ");
      });

      if (matched) {
        try {
          if (typeof cmd.handleReply === "function") {
            const handled = await cmd.handleReply(api, event, event.messageID, event.threadID, senderID, body);
            if (handled) return true;
          } else if (typeof cmd.execute === "function") {
            const args = trimmed.split(/\s+/).slice(1);
            await cmd.execute(api, event, args, db, config, { prefix: config.prefix, commands });
            return true;
          }
        } catch (e) {
          console.log(`[trigger-reply] ${cmd.name}: ${e.message}`);
        }
        return true;
      }
    }
  }

  /* ═══ 3. TEXT/WORD TRIGGERS ═══ */
  if (!trimmed.startsWith(config.prefix)) {
    const lower = trimmed.toLowerCase();

    for (const [key, cmd] of commands) {
      if (!cmd.triggers || !cmd.triggers.text) continue;
      if (!Array.isArray(cmd.triggers.text)) continue;

      const matched = cmd.triggers.text.some((t) => {
        const lt = String(t).toLowerCase();
        return lower === lt || lower.startsWith(lt + " ");
      });

      if (matched) {
        try {
          const args = trimmed.split(/\s+/).slice(1);
          await cmd.execute(api, event, args, db, config, { prefix: config.prefix, commands });
          return true;
        } catch (e) {
          console.log(`[trigger-text] ${cmd.name}: ${e.message}`);
        }
        return true;
      }
    }
  }

  /* ═══ 4. REGEX TRIGGERS ═══ */
  for (const [key, cmd] of commands) {
    if (!cmd.triggers || !cmd.triggers.regex) continue;
    if (!Array.isArray(cmd.triggers.regex)) continue;

    for (const pattern of cmd.triggers.regex) {
      try {
        const re = pattern instanceof RegExp ? pattern : new RegExp(pattern, "i");
        if (re.test(trimmed)) {
          try {
            const args = trimmed.split(/\s+/).slice(1);
            await cmd.execute(api, event, args, db, config, { prefix: config.prefix, commands });
            return true;
          } catch (e) {
            console.log(`[trigger-regex] ${cmd.name}: ${e.message}`);
          }
          return true;
        }
      } catch (_) {}
    }
  }

  return false;
}

module.exports = { checkTriggers };