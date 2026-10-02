// commands/economy/top.js - NEXUS V1 - Top 10 Rich (Fixed)
const { generateTopCard, loadAvatar } = require("../../utils/topCard");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

module.exports = {
  name: "top",
  aliases: ["rich", "leaderboard", "richlist"],
  version: "4.0.0",
  role: 0,
  description: "Top 15 richest users (premium card)",
  usage: "/top",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    let tmpPath = null;

    try {
      /* ⚡ Fetch ALL users (we sort in-memory by TOTAL) */
      const users = await db.User.find({}).limit(100).lean();

      if (!users || !users.length) {
        return api.sendMessage(
          `📊 No users in database yet.\n\n💡 Start earning with /daily or /work!`,
          threadID
        );
      }

      /* ⚡ Sort by TOTAL (balance + bank) — highest first */
      users.sort((a, b) => {
        const at = (a.balance || 0) + (a.bank || 0);
        const bt = (b.balance || 0) + (b.bank || 0);
        return bt - at;
      });

      /* Take top 15 */
      const top15 = users.slice(0, 15);

      /* ⚡ Enrich with names + avatars (parallel) */
      const enriched = await Promise.all(
        top15.map(async (u, idx) => {
          const total = (u.balance || 0) + (u.bank || 0);
          let name = u.userID;

          try {
            const info = await api.getUserInfo(u.userID);
            if (info && info[u.userID] && info[u.userID].name) {
              name = info[u.userID].name;
            }
          } catch (_) {}

          const avatar = await loadAvatar(u.userID);

          return {
            rank: idx + 1,
            name,
            avatar,
            total,
            userID: u.userID
          };
        })
      );

      /* Generate card */
      const buf = await generateTopCard(enriched);
      if (!buf) {
        return api.sendMessage("❌ Failed to generate leaderboard.", threadID);
      }

      /* Save temp + send */
      tmpPath = path.join(os.tmpdir(), `nexus_top_${Date.now()}.png`);
      await fs.writeFile(tmpPath, buf);

      api.sendMessage({
        body: "",
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[top] error:", e.message);
      api.sendMessage("❌ Failed: " + e.message, threadID);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    }
  }
};
// Powered by Shihab