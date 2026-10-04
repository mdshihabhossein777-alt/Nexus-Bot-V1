/**
 * commands/utility/tempmail.js
 * NEXUS BOT V1 — Temporary email (mail.tm API)
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
fs.ensureDirSync(DATA_DIR);
const TM_FILE = path.join(DATA_DIR, "tempmail.json");

const API = "https://api.mail.tm";

/* ═══ Storage ═══ */
function loadDB() {
  try { return fs.readJsonSync(TM_FILE) || {}; } catch (_) { return {}; }
}
function saveDB(d) {
  try { fs.writeJsonSync(TM_FILE, d); } catch (e) { console.error("[tempmail]", e.message); }
}

/* ═══ Random string ═══ */
function randStr(len) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/* ═══ Get available domains ═══ */
async function getDomains() {
  const r = await axios.get(`${API}/domains`, { timeout: 15000 });
  return r.data["hydra:member"] || r.data || [];
}

/* ═══ Create account ═══ */
async function createAccount(address, password) {
  const r = await axios.post(`${API}/accounts`, { address, password }, {
    headers: { "Content-Type": "application/json" },
    timeout: 15000
  });
  return r.data;
}

/* ═══ Get token ═══ */
async function getToken(address, password) {
  const r = await axios.post(`${API}/token`, { address, password }, {
    headers: { "Content-Type": "application/json" },
    timeout: 15000
  });
  return r.data.token;
}

/* ═══ Get messages ═══ */
async function getMessages(token) {
  const r = await axios.get(`${API}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000
  });
  return r.data["hydra:member"] || r.data || [];
}

/* ═══ Get single message ═══ */
async function getMessage(token, id) {
  const r = await axios.get(`${API}/messages/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000
  });
  return r.data;
}

/* ═══ Main Command ═══ */
module.exports = {
  name: "tempmail",
  aliases: ["tm", "temp", "tempm", "disposablemail"],
  version: "1.0.0",
  role: 0,
  description: "Create temporary email and receive messages",
  usage: "/tempmail <new|inbox|read|delete|help>",
  category: "utility",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    const sub = (args[0] || "help").toLowerCase();
    const uid = String(senderID);

    const store = loadDB();
    const user = store[uid];

    /* ═══════════ HELP ═══════════ */
    if (sub === "help" || sub === "h") {
      react("📘");
      return api.sendMessage(
        `📧 TEMPMAIL SYSTEM\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 Commands:\n` +
        `  /tm new              → Create new temp email\n` +
        `  /tm inbox            → Check messages\n` +
        `  /tm read <number>    → Read specific message\n` +
        `  /tm delete           → Delete current email\n` +
        `  /tm mymail           → Show your email\n\n` +
        `💡 Use this email to sign up on any site\n` +
        `🔒 Free, no signup, unlimited`,
        threadID
      );
    }

    /* ═══════════ NEW ═══════════ */
    if (sub === "new" || sub === "n" || sub === "create") {
      react("⏳");
      try {
        /* ═══ Get domains ═══ */
        const domains = await getDomains();
        if (!domains.length) throw new Error("no domains available");

        const domain = domains[0].domain || domains[0];
        console.log(`[tempmail] domain: ${domain}`);

        /* ═══ Generate credentials ═══ */
        const username = `nexus${randStr(8)}`;
        const password = randStr(12);
        const address = `${username}@${domain}`;

        /* ═══ Create account ═══ */
        await createAccount(address, password);

        /* ═══ Get token ═══ */
        const token = await getToken(address, password);

        /* ═══ Save to store ═══ */
        store[uid] = {
          address,
          password,
          token,
          createdAt: Date.now()
        };
        saveDB(store);

        react("✅");
        return api.sendMessage(
          `📧 TEMP EMAIL CREATED\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📮 Email: \`${address}\`\n` +
          `\n` +
          `📌 How to use:\n` +
          `  1️⃣ Copy this email\n` +
          `  2️⃣ Use it on any site\n` +
          `  3️⃣ Come back: /tm inbox\n` +
          `\n` +
          `⚠️ Save this email — expires anytime`,
          threadID
        );
      } catch (e) {
        console.error("[tempmail/new]", e.message);
        react("❌");
        return api.sendMessage(`❌ Failed to create email: ${e.message.slice(0, 60)}`, threadID);
      }
    }

    /* ═══════════ INBOX ═══════════ */
    if (sub === "inbox" || sub === "i" || sub === "check" || sub === "messages") {
      if (!user || !user.token) {
        react("❌");
        return api.sendMessage("❌ No email found. Use `/tm new` first.", threadID);
      }

      react("⏳");
      try {
        const messages = await getMessages(user.token);

        if (!messages.length) {
          react("📭");
          return api.sendMessage(
            `📭 INBOX EMPTY\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📮 ${user.address}\n\n` +
            `💡 Waiting for emails...\n` +
            `🔄 Check again: /tm inbox`,
            threadID
          );
        }

        const lines = [];
        lines.push("📬 INBOX");
        lines.push("━━━━━━━━━━━━━━━━━━━━");
        lines.push(`📮 ${user.address}`);
        lines.push(`📊 Total: ${messages.length} message(s)`);
        lines.push("");

        messages.slice(0, 10).forEach((m, i) => {
          const from = m.from?.address || "unknown";
          const subj = (m.subject || "(no subject)").slice(0, 40);
          const seen = m.seen ? "✅" : "🆕";
          lines.push(`${i + 1}. ${seen} ${subj}`);
          lines.push(`   📤 from: ${from.slice(0, 35)}`);
        });

        if (messages.length > 10) {
          lines.push(`\n... and ${messages.length - 10} more`);
        }

        lines.push("");
        lines.push("💡 Read: /tm read <number>");

        react("📬");
        return api.sendMessage(lines.join("\n"), threadID);

      } catch (e) {
        console.error("[tempmail/inbox]", e.message);
        react("❌");
        return api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
      }
    }

    /* ═══════════ READ ═══════════ */
    if (sub === "read" || sub === "r") {
      if (!user || !user.token) {
        react("❌");
        return api.sendMessage("❌ No email. Use `/tm new` first.", threadID);
      }

      const num = parseInt(args[1]);
      if (!Number.isFinite(num) || num < 1) {
        react("❓");
        return api.sendMessage("Usage: /tm read <number>", threadID);
      }

      react("⏳");
      try {
        const messages = await getMessages(user.token);
        if (!messages.length) throw new Error("inbox empty");

        const msg = messages[num - 1];
        if (!msg) throw new Error("message not found");

        /* ═══ Fetch full message ═══ */
        const full = await getMessage(user.token, msg.id);

        /* ═══ Extract body text ═══ */
        let body = full.text || "";
        if (!body && full.html && full.html.length) {
          body = full.html
            .map((h) => h.replace(/<[^>]*>/g, ""))
            .join("\n")
            .replace(/\s+/g, " ")
            .trim();
        }

        if (body.length > 1500) body = body.slice(0, 1500) + "...\n(truncated)";

        /* ═══ Extract OTP code if present ═══ */
        const otpMatch = body.match(/\b\d{4,8}\b/);
        const otpLine = otpMatch ? `\n🔢 Possible code: **${otpMatch[0]}**` : "";

        react("📩");
        return api.sendMessage(
          `📩 MESSAGE ${num}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📤 From: ${msg.from?.address || "unknown"}\n` +
          `📝 Subject: ${msg.subject || "(no subject)"}\n` +
          `⏰ Date: ${new Date(msg.createdAt).toLocaleString()}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          body +
          otpLine,
          threadID
        );

      } catch (e) {
        console.error("[tempmail/read]", e.message);
        react("❌");
        return api.sendMessage(`❌ ${e.message.slice(0, 60)}`, threadID);
      }
    }

    /* ═══════════ DELETE ═══════════ */
    if (sub === "delete" || sub === "del" || sub === "remove") {
      if (!user) {
        react("❌");
        return api.sendMessage("❌ No email to delete.", threadID);
      }

      delete store[uid];
      saveDB(store);

      react("🗑️");
      return api.sendMessage(
        `🗑️ Email deleted\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📮 ${user.address}\n\n` +
        `💡 Create new: /tm new`,
        threadID
      );
    }

    /* ═══════════ MYMAIL ═══════════ */
    if (sub === "mymail" || sub === "my" || sub === "info") {
      if (!user) {
        react("❌");
        return api.sendMessage("❌ No email. Use `/tm new` first.", threadID);
      }

      const ageMin = Math.floor((Date.now() - user.createdAt) / (60 * 1000));

      react("📮");
      return api.sendMessage(
        `📮 YOUR EMAIL\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📧 \`${user.address}\`\n` +
        `⏰ Created: ${ageMin} min ago\n\n` +
        `💡 Check inbox: /tm inbox`,
        threadID
      );
    }

    /* ═══════════ UNKNOWN ═══════════ */
    react("❓");
    return api.sendMessage(
      `❓ Unknown command: \`${sub}\`\n\n` +
      `💡 Use: /tm help`,
      threadID
    );
  }
};

// © 2026 NEXUS BOT V1