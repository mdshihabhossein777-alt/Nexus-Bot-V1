/**
 * commands/owner/makecmd.js
 * NEXUS BOT V1 — Create command file + auto-push to GitHub
 * © 2026
 */

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

/* ═══ GitHub API push ═══ */
async function pushToGitHub(filePath, content) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.log("[makecmd] GitHub not configured — skipping push");
    return { success: false, reason: "not configured" };
  }

  const apiUrl = "https://api.github.com/repos/" + repo + "/contents/" + filePath;

  try {
    /* Check if file exists (get SHA) */
    let sha = null;
    try {
      const check = await axios.get(apiUrl, {
        headers: {
          "Authorization": "token " + token,
          "User-Agent": "Nexus-Bot"
        },
        timeout: 15000
      });
      sha = check.data.sha;
    } catch (_) {}

    /* Create/update */
    const body = {
      message: "[makecmd] " + (sha ? "Update" : "Add") + " " + filePath,
      content: Buffer.from(content).toString("base64"),
      branch: "main"
    };
    if (sha) body.sha = sha;

    const r = await axios.put(apiUrl, body, {
      headers: {
        "Authorization": "token " + token,
        "Content-Type": "application/json",
        "User-Agent": "Nexus-Bot"
      },
      timeout: 30000
    });

    console.log("[makecmd] ✅ GitHub push success");
    return { success: true, action: sha ? "updated" : "created", url: r.data.content.html_url };

  } catch (e) {
    const errMsg = (e.response && e.response.data && e.response.data.message) || e.message;
    console.log("[makecmd] GitHub push failed: " + errMsg);
    return { success: false, reason: errMsg };
  }
}

module.exports = {
  name: "makecmd",
  aliases: ["createcmd", "newcmd", "addcmd"],
  version: "3.0.0",
  role: 2,
  description: "Create command file + push to GitHub",
  usage: "/makecmd <path>  (reply to code)",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID, messageReply } = event;

    const react = (emoji) => {
      if (messageID) try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    console.log("[makecmd] triggered, args=" + JSON.stringify(args));

    /* ═══ Owner check ═══ */
    const isOwner = String(senderID) === String(config.ownerID) ||
                    (config.adminIDs || []).map(String).includes(String(senderID));
    if (!isOwner) { react("⛔"); return; }

    /* ═══ Help ═══ */
    if (!args.length) {
      react("📘");
      const ghStatus = (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) ? "✅ Enabled" : "❌ Not configured";
      return api.sendMessage(
        "🛠️ AUTO COMMAND CREATOR\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "📝 Usage:\n" +
        "1. Send code as a message\n" +
        "2. Reply to that message\n" +
        "3. Send: /makecmd <path>\n\n" +
        "📌 Example:\n" +
        "/makecmd commands/fun/test.js\n\n" +
        "🌐 GitHub Push: " + ghStatus,
        threadID
      );
    }

    /* ═══ Reply check ═══ */
    if (!messageReply || !messageReply.body) {
      react("❓");
      return api.sendMessage("❌ Reply to a message containing the code.", threadID);
    }

    react("⏳");

    try {
      /* ═══ Parse path ═══ */
      let relPath = args[0].trim().replace(/\\/g, "/");
      if (!relPath.startsWith("commands/")) relPath = "commands/" + relPath;
      if (!relPath.endsWith(".js")) relPath += ".js";

      if (!relPath.startsWith("commands/") || relPath.includes("..")) {
        react("⛔");
        return api.sendMessage("❌ Invalid path", threadID);
      }

      /* ═══ Get code ═══ */
      let code = messageReply.body || "";
      code = code.replace(/^```(?:javascript|js|node)?\n?/i, "").replace(/\n?```$/i, "").trim();

      console.log("[makecmd] code length: " + code.length);

      if (code.length < 20) {
        react("❌");
        return api.sendMessage("❌ Code too short (min 20 chars).", threadID);
      }

      if (!/module\.exports|exports\./i.test(code)) {
        react("⚠️");
        return api.sendMessage("⚠️ Code missing `module.exports`.", threadID);
      }

      /* ═══ Write file locally ═══ */
      const fullPath = path.join(__dirname, "..", "..", relPath);
      fs.ensureDirSync(path.dirname(fullPath));
      const existed = fs.existsSync(fullPath);
      await fs.writeFile(fullPath, code, "utf8");

      console.log("[makecmd] file saved: " + relPath);

      /* ═══ Push to GitHub ═══ */
      const gitResult = await pushToGitHub(relPath, code);

      /* ═══ Reload commands ═══ */
      try {
        if (global.NEXUS && typeof global.NEXUS.loadCommands === "function") {
          global.NEXUS.loadCommands();
          console.log("[makecmd] reloaded");
        }
      } catch (e) {
        console.log("[makecmd] reload fail: " + e.message);
      }

      /* ═══ Get command name ═══ */
      let cmdName = "unknown";
      const m = code.match(/name\s*:\s*["']([^"']+)["']/);
      if (m) cmdName = m[1];

      react("✅");

      const ghLine = gitResult.success
        ? "🌐 GitHub: ✅ " + gitResult.action
        : "🌐 GitHub: ❌ " + String(gitResult.reason || "").slice(0, 50);

      return api.sendMessage(
        "✅ Command " + (existed ? "UPDATED" : "CREATED") + "\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "📁 " + relPath + "\n" +
        "🏷️ " + cmdName + "\n" +
        "📊 " + code.length + " bytes\n" +
        ghLine + "\n" +
        "🔄 Reloaded: yes\n" +
        "💡 Test: /" + cmdName,
        threadID
      );

    } catch (e) {
      console.error("[makecmd] error: " + e.message);
      react("❌");
      api.sendMessage("❌ " + e.message.slice(0, 80), threadID);
    }
  }
};