// commands/owner/makecmd.js - AI Command Builder
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const SESSION_FILE = path.join(DATA_DIR, "makecmd-sessions.json");

function loadSessions() {
  try { return fs.readJsonSync(SESSION_FILE) || {}; } catch (_) { return {}; }
}
function saveSessions(d) {
  try { fs.writeJsonSync(SESSION_FILE, d); } catch (e) {}
}

async function askAI(prompt) {
  const sys = `তুমি একজন expert Node.js developer. Messenger bot এর জন্য command file বানাও. শুধু valid JavaScript return করো, কোনো markdown block বা explanation না.

Template:
module.exports = {
  name: "cmdname",
  aliases: [],
  version: "1.0.0",
  role: 0,
  description: "desc",
  usage: "/cmdname",
  execute: async function (api, event, args, db, config) {
    const { threadID, senderID } = event;
    try {
      api.sendMessage("output", threadID);
    } catch (e) {
      api.sendMessage("Error: " + e.message, threadID);
    }
  }
};

Rules:
- role 0=all, 1=admin, 2=owner
- api.sendMessage(msg, threadID) for text
- api.sendMessage({body:"", attachment: fs.createReadStream(path)}, threadID) for media
- Bangla reply হলে Banglish use করো
- Free APIs use করো (no keys)
- শুধু JS code, markdown ছাড়া`;

  const endpoints = [
    async () => {
      const r = await axios.post(
        "https://api.kilo.ai/api/gateway/chat/completions",
        {
          model: "kilo-auto/free",
          messages: [{ role: "system", content: sys }, { role: "user", content: prompt }],
          max_tokens: 1000
        },
        { headers: { "Content-Type": "application/json" }, timeout: 30000 }
      );
      return r.data?.choices?.[0]?.message?.content;
    },
    async () => {
      const r = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(sys + "\n\n" + prompt)}`,
        { params: { model: "openai" }, timeout: 30000 }
      );
      return typeof r.data === "string" ? r.data : null;
    }
  ];

  for (const fn of endpoints) {
    try {
      const text = await fn();
      if (text && text.length > 50) return text;
    } catch (_) {}
  }
  return null;
}

function cleanCode(text) {
  if (!text) return null;
  let code = text.trim();
  code = code.replace(/^```(?:javascript|js)?\n?/i, "").replace(/\n?```\s*$/, "").trim();
  if (!code.startsWith("module.exports")) {
    const idx = code.indexOf("module.exports");
    if (idx >= 0) code = code.slice(idx);
  }
  return code;
}

function validateCode(code) {
  if (!code) return { ok: false, err: "Empty" };
  if (!code.includes("module.exports")) return { ok: false, err: "Missing module.exports" };
  if (!code.includes("name:")) return { ok: false, err: "Missing name" };
  if (!code.includes("execute")) return { ok: false, err: "Missing execute" };
  try {
    new Function("module", "require", "exports", code);
    return { ok: true };
  } catch (e) {
    return { ok: false, err: e.message };
  }
}

module.exports = {
  name: "makecmd",
  aliases: ["mkcmd", "newcmd"],
  version: "1.0.0",
  role: 2,
  description: "AI দিয়ে নতুন command বানাও",
  usage: "/makecmd create <name> <desc> | save | cancel | list",
  execute: async function (api, event, args, db, config) {
    const { threadID, senderID } = event;
    try {
      const sub = (args[0] || "").toLowerCase();
      const sessions = loadSessions();

      /* cancel */
      if (sub === "cancel") {
        delete sessions[senderID];
        saveSessions(sessions);
        return api.sendMessage(`✅ Cancel hoye gelo.`, threadID);
      }

      /* list */
      if (sub === "list") {
        const CUSTOM_DIR = path.join(__dirname, "..", "custom");
        if (!fs.existsSync(CUSTOM_DIR)) return api.sendMessage(`📋 Kono custom command nei.`, threadID);
        const files = fs.readdirSync(CUSTOM_DIR).filter((f) => f.endsWith(".js"));
        if (!files.length) return api.sendMessage(`📋 Kono custom command nei.`, threadID);
        const list = files.map((f, i) => `${i + 1}. /${f.replace(".js", "")}`).join("\n");
        return api.sendMessage(`🎨 CUSTOM COMMANDS (${files.length})\n━━━━━━━━━━━━━━━━━━\n${list}`, threadID);
      }

      /* create */
      if (sub === "create" || sub === "build") {
        const name = (args[1] || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const prompt = args.slice(2).join(" ").trim();
        if (!name) return api.sendMessage(`📝 /makecmd create <name> <description>`, threadID);
        if (!prompt) return api.sendMessage(`📝 Ki hobe describe koro`, threadID);

        api.sendMessage(`🤔 AI diye "${name}" banachi...`, threadID);

        const raw = await askAI(`Command name: ${name}\n\nRequirement: ${prompt}\n\nEkta complete command file banao.`);
        if (!raw) return api.sendMessage(`❌ AI code generate korte parlo na.`, threadID);

        const code = cleanCode(raw);
        const check = validateCode(code);
        if (!check.ok) return api.sendMessage(`❌ Invalid code: ${check.err}`, threadID);

        sessions[senderID] = { name, code, prompt, time: Date.now() };
        saveSessions(sessions);

        const preview = code.slice(0, 1200) + (code.length > 1200 ? "\n...(truncated)" : "");

        return api.sendMessage(
          `✅ CODE GENERATED\n━━━━━━━━━━━━━━━━━━\n📄 Name: ${name}\n📏 Lines: ${code.split("\n").length}\n\nPreview:\n\`\`\`\n${preview}\n\`\`\`\n\n💾 Save: /makecmd save\n❌ Cancel: /makecmd cancel`,
          threadID
        );
      }

      /* save */
      if (sub === "save") {
        const session = sessions[senderID];
        if (!session) return api.sendMessage(`⚠️ Kono pending code nei.`, threadID);

        const CUSTOM_DIR = path.join(__dirname, "..", "custom");
        fs.ensureDirSync(CUSTOM_DIR);
        const filePath = path.join(CUSTOM_DIR, `${session.name}.js`);

        if (fs.existsSync(filePath)) {
          return api.sendMessage(`⚠️ "${session.name}" already ache.`, threadID);
        }

        fs.writeFileSync(filePath, session.code);
        delete sessions[senderID];
        saveSessions(sessions);

        try { if (global.NEXUS && global.NEXUS.loadCommands) global.NEXUS.loadCommands(); } catch (_) {}

        return api.sendMessage(
          `✅ SAVED!\n📄 commands/custom/${session.name}.js\n🎯 Test: /${session.name}`,
          threadID
        );
      }

      /* help */
      api.sendMessage(
        `🎨 AI COMMAND BUILDER\n━━━━━━━━━━━━━━━━━━\n\n` +
        `/makecmd create <name> <description>\n` +
        `/makecmd save\n` +
        `/makecmd cancel\n` +
        `/makecmd list\n\n` +
        `Example:\n/makecmd create hello Jodi /hello dey to "Kemon acho!" bolo`,
        threadID
      );
    } catch (e) {
      api.sendMessage("❌ Error: " + e.message, threadID);
    }
  }
};