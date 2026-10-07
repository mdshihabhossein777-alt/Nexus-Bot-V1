  /* ═══ YTB REPLY HANDLER ═══ */
  if (event.messageReply && event.messageReply.messageID && trimmed) {
    try {
      const ytbStore = require("./ytbStore");
      const num = parseInt(trimmed);
      const entry = ytbStore.get(String(event.messageReply.messageID));

      if (entry && Number.isFinite(num) && num >= 1 && num <= entry.results.length) {
        const video = entry.results[num - 1];
        const threadID = event.threadID;
        const messageID = event.messageID;
        const fs = require("fs-extra");
        const path = require("path");
        const os = require("os");

        if (messageID) try { api.setMessageReaction("⏳", messageID, threadID, () => {}); } catch (_) {}

        ytbStore.delete(String(event.messageReply.messageID));

        try {
          const { YtDlp } = require("ytdlp-nodejs");
          const ytdlp = new YtDlp();
          const url = `https://www.youtube.com/watch?v=${video.videoId}`;

          /* Cookie path */
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

          let finalPath = null;
          let mb = 0;

          if (entry.type === "audio") {
            /* Audio with 25MB limit */
            const tmpPath = path.join(os.tmpdir(), `ytb_a_${Date.now()}.mp3`);
            const opts = {
              output: tmpPath,
              audioQuality: "5",
              noWarnings: true,
              noProgress: true,
              retries: 3,
              extractorArgs: "youtube:player_client=android,ios,web_safari"
            };
            if (cookiesPath) opts.cookies = cookiesPath;

            const result = await ytdlp.downloadAudio(url, "mp3", opts);

            if (result && result.filePaths && result.filePaths.length) {
              finalPath = result.filePaths[0];
            } else if (fs.existsSync(tmpPath)) {
              finalPath = tmpPath;
            }

            if (!finalPath || !fs.existsSync(finalPath)) throw new Error("Audio failed");

            const stat = fs.statSync(finalPath);
            mb = stat.size / 1024 / 1024;

            if (stat.size > 25 * 1024 * 1024) {
              try { fs.unlinkSync(finalPath); } catch (_) {}
              throw new Error(`Audio too big (${mb.toFixed(1)} MB > 25 MB)`);
            }
          } else {
            /* Video — quality fallback with 25MB limit */
            const qualities = ["360", "240", "144"];
            for (const q of qualities) {
              const tmpPath = path.join(os.tmpdir(), `ytb_v_${Date.now()}_${q}.mp4`);
              const opts = {
                output: tmpPath,
                videoQuality: q,
                noWarnings: true,
                noProgress: true,
                retries: 2,
                extractorArgs: "youtube:player_client=android,ios,web_safari"
              };
              if (cookiesPath) opts.cookies = cookiesPath;

              try {
                const result = await ytdlp.downloadVideo(url, "mp4", opts);

                if (result && result.filePaths && result.filePaths.length) {
                  finalPath = result.filePaths[0];
                } else if (fs.existsSync(tmpPath)) {
                  finalPath = tmpPath;
                }

                if (!finalPath || !fs.existsSync(finalPath)) continue;

                const stat = fs.statSync(finalPath);
                mb = stat.size / 1024 / 1024;

                if (stat.size <= 25 * 1024 * 1024) break;
                console.log(`[ytb] ${q}p too big — retry`);
                try { fs.unlinkSync(finalPath); } catch (_) {}
                finalPath = null;
              } catch (_) { continue; }
            }

            if (!finalPath) throw new Error(`Video > 25 MB in all qualities`);
          }

          api.sendMessage({
            body: `🎬 ${video.title?.slice(0, 80) || ""}\n📦 ${mb.toFixed(2)} MB`,
            attachment: fs.createReadStream(finalPath)
          }, threadID, () => {
            try { fs.unlinkSync(finalPath); } catch (_) {}
            if (messageID) try { api.setMessageReaction("✅", messageID, threadID, () => {}); } catch (_) {}
          });

        } catch (e) {
          console.error("[ytb-reply]", e.message);
          if (messageID) try { api.setMessageReaction("❌", messageID, threadID, () => {}); } catch (_) {}
          api.sendMessage(
            e.message.includes("too big") ? `⚠️ ${e.message}` : `❌ ${e.message.slice(0, 80)}`,
            threadID
          );
        }
        return true;
      }
    } catch (e) {
      console.error("[ytb-trigger]", e.message);
    }
  }