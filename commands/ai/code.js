/**
 * commands/ai/code.js
 * NEXUS BOT V1 — AI code generator (Groq, multi-model)
 * © 2026
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

/* ═══════════════════════════════════════════════════════════════════
   KEY LOADER
   ═══════════════════════════════════════════════════════════════════ */
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const KEY_FILE = path.join(DATA_DIR, "groq_key.txt");

function getGroqKey() {
  /* 1. data/groq_key.txt */
  try {
    if (fs.existsSync(KEY_FILE)) {
      const k = fs.readFileSync(KEY_FILE, "utf8").trim();
      if (k && k.startsWith("gsk_")) return k;
    }
  } catch (_) {}

  /* 2. env */
  const env = process.env.GROQ_API_KEY || process.env.GROQ_KEY;
  if (env && env.startsWith("gsk_")) return env;

  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   MODELS (fallback chain)
   ═══════════════════════════════════════════════════════════════════ */
const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it"
];

/* ═══════════════════════════════════════════════════════════════════
   COOLDOWN
   ═══════════════════════════════════════════════════════════════════ */
const cooldowns = new Map();
const COOLDOWN_MS = 20 * 1000;

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMMAND PROMPTS
   ═══════════════════════════════════════════════════════════════════ */
const PROMPTS = {
  code: {
    system:
      "You are a senior software engineer. Generate clean, production-ready code. " +
      "Always include: (1) brief explanation in 2-3 lines, (2) code in triple backticks with language tag, " +
      "(3) usage example if relevant. If user writes in Bengali, reply explanation in Bengali but keep code in English. " +
      "Never add fake APIs or hallucinate libraries. Prefer standard libraries.",
    label: "💻 Code Generator"
  },
  debug: {
    system:
      "You are a debugging expert. Analyze the given code, find bugs, explain the problem clearly, " +
      "then provide the FIXED code inside triple backticks. Format:\n" +
      "🐛 Problem: ...\n⚡ Fix: ...\n```language\n<fixed code>\n```",
    label: "🐛 Debugger"
  },
  explainCode: {
    system:
      "You are a code teacher. Explain the given code line by line in simple language. " +
      "If user writes in Bengali, explain in Bengali. Format:\n" +
      "📖 Overview: ...\n🔍 Line-by-line: ...\n💡 Key concepts: ...",
    label: "📖 Code Explainer"
  },
  convert: {
    system:
      "You convert code between programming languages. Detect source language, convert to target. " +
      "Return only the converted code in triple backticks with the target language tag. " +
      "Preserve functionality exactly.",
    label: "🔄 Code Converter"
  },
  regex: {
    system:
      "You are a regex expert. Generate a regex pattern based on user's description. " +
      "Return:\n🔍 Pattern: `regex here`\n📝 Explanation: ...\n💡 Example match: ...\n" +
      "Support JavaScript, Python, PCRE.",
    label: "🔍 Regex Generator"
  },
  sql: {
    system:
      "You are a SQL expert. Generate SQL queries from natural language descriptions. " +
      "Return:\n📝 Query: ```sql\n<query>\n```\n💡 Explanation: ...\n" +
      "Assume standard SQL unless user specifies MySQL/PostgreSQL/SQLite.",
    label: "🗄️ SQL Generator"
  }
};

/* ═══════════════════════════════════════════════════════════════════
   GROQ API CALL with model fallback
   ═══════════════════════════════════════════════════════════════════ */
async function callGroq(systemPrompt, userMessage, key) {
  let lastErr = null;

  for (const model of MODELS) {
    try {
      console.log(`[code] trying model: ${model}`);

      const r = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          temperature: 0.3,
          max_tokens: 4000,
          top_p: 0.95
        },
        {
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json"
          },
          timeout: 45000
        }
      );

      const content = r.data?.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        console.log(`[code] ✅ ${model}`);
        return { content: content.trim(), model };
      }
    } catch (e) {
      const status = e.response?.status;
      const errMsg = e.response?.data?.error?.message || e.message;
      console.log(`[code] ${model} failed (${status || "?"}): ${errMsg}`);
      lastErr = new Error(errMsg || e.message);

      /* 401/403 = bad key — no point trying other models */
      if (status === 401 || status === 403) {
        throw new Error("Invalid Groq API key. Use /setgroq to update.");
      }
      /* 429 = rate limit — try next model */
      /* 404 = model not found — try next */
    }
  }

  throw lastErr || new Error("All Groq models failed");
}

/* ═══════════════════════════════════════════════════════════════════
   FORMAT OUTPUT
   ═══════════════════════════════════════════════════════════════════ */
function formatOutput(label, content, model) {
  /* Messenger limit ~2000 chars */
  const MAX = 1900;
  let body = content;

  if (body.length > MAX) {
    body = body.slice(0, MAX - 50) + "\n\n... _(truncated)_";
  }

  return (
    `${label}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    body +
    `\n\n🤖 ${model}`
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════════════ */
module.exports = {
  name: "code",
  aliases: ["debug", "explain-code", "explaincode", "convert", "regex", "sql", "generatecode"],
  version: "1.0.0",
  role: 0,
  description: "AI code generator (Groq, multi-model)",
  usage: "/code <prompt> | /debug <code> | /explain-code <code> | /regex <desc> | /sql <desc>",
  category: "ai",

  execute: async function (api, event, args, db, config, extras) {
    const { threadID, messageID, senderID, body, messageReply } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Check key ═══ */
    const key = getGroqKey();
    if (!key) {
      react("⚠️");
      return api.sendMessage(
        `⚠️ Groq API key missing\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📝 Set it with:\n` +
        `/setgroq gsk_xxxxxxxxxxxxx\n\n` +
        `🔗 Get free key: https://console.groq.com/keys`,
        threadID
      );
    }

    /* ═══ Detect which sub-command ═══ */
    const prefix = (extras && extras.prefix) || config.prefix || "/";
    const rawBody = (body || "").trim();
    const noPrefix = rawBody.startsWith(prefix)
      ? rawBody.slice(prefix.length).trim()
      : rawBody;
    const firstWord = (noPrefix.split(/\s+/)[0] || "").toLowerCase();

    let cmdKey = "code";
    if (firstWord === "debug") cmdKey = "debug";
    else if (firstWord === "explain-code" || firstWord === "explaincode") cmdKey = "explainCode";
    else if (firstWord === "convert") cmdKey = "convert";
    else if (firstWord === "regex") cmdKey = "regex";
    else if (firstWord === "sql") cmdKey = "sql";

    const cfg = PROMPTS[cmdKey];

    /* ═══ Build prompt text ═══ */
    let prompt = (args || []).join(" ").trim();

    /* Strip command name if still in prompt */
    if (prompt.toLowerCase().startsWith(firstWord)) {
      prompt = prompt.slice(firstWord.length).trim();
    }

    /* Use reply if no args */
    if (!prompt && messageReply && messageReply.body) {
      prompt = String(messageReply.body).trim();
    }

    if (!prompt) {
      react("❓");
      return api.sendMessage(
        `${cfg.label}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📌 Usage:\n` +
        `• /code <description>\n` +
        `• /debug <code>\n` +
        `• /explain-code <code>\n` +
        `• /convert <code>\n` +
        `• /regex <description>\n` +
        `• /sql <description>\n` +
        `• Reply to code + /debug\n\n` +
        `📝 Example:\n` +
        `/code express server with JWT auth\n` +
        `/code python web scraper\n` +
        `/regex email validation\n` +
        `/sql users who ordered in last 30 days`,
        threadID
      );
    }

    /* Length guard */
    if (prompt.length > 3000) prompt = prompt.slice(0, 3000);

    /* ═══ Cooldown (owner unlimited) ═══ */
    const isOwner =
      String(senderID) === String(config.ownerID) ||
      (config.adminIDs || []).map(String).includes(String(senderID));

    if (!isOwner) {
      const last = cooldowns.get(String(senderID)) || 0;
      const remain = COOLDOWN_MS - (Date.now() - last);
      if (remain > 0) {
        react("⏳");
        return api.sendMessage(
          `⏳ Slow down — ${Math.ceil(remain / 1000)}s left`,
          threadID
        );
      }
      cooldowns.set(String(senderID), Date.now());
      if (cooldowns.size > 5000) cooldowns.clear();
    }

    react("⏳");
    console.log(`[code] cmd=${cmdKey} prompt="${prompt.slice(0, 80)}"`);

    /* ═══ Call Groq ═══ */
    try {
      const { content, model } = await callGroq(cfg.system, prompt, key);

      const output = formatOutput(cfg.label, content, model);

      react("✅");
      return api.sendMessage(output, threadID);

    } catch (e) {
      console.error("[code] error:", e.message);
      react("❌");

      let msg = e.message;
      if (msg.includes("Invalid Groq")) {
        /* keep as-is */
      } else if (msg.includes("timeout")) {
        msg = "Request timeout — try again";
      } else if (msg.includes("rate") || msg.includes("429")) {
        msg = "Rate limited — wait a moment and retry";
      } else if (msg.includes("All Groq")) {
        msg = "All Groq models unavailable — try again later";
      } else {
        msg = msg.slice(0, 200);
      }

      return api.sendMessage(`❌ ${msg}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1