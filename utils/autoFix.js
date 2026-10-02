// utils/autoFix.js - AI-powered error fixer
const axios = require("axios");
const fs = require("fs-extra");

function isAutoFixable(error) {
  const msg = String(error || "").toLowerCase();
  const patterns = [
    "is not a function", "cannot read propert", "is not defined",
    "unexpected token", "cannot find module", "save is not",
    "execute is not", "undefined", "null"
  ];
  return patterns.some((p) => msg.includes(p));
}

async function askAIFix(filePath, originalCode, errorMsg, stack) {
  const prompt = `তুমি expert Node.js developer. নিচের code এ error হচ্ছে, ঠিক করে সম্পূর্ণ fixed code দাও।

File: ${filePath}
Error: ${errorMsg}

Stack:
${(stack || "").slice(0, 1500)}

Original Code:
\`\`\`javascript
${originalCode.slice(0, 3000)}
\`\`\`

Rules:
- শুধু corrected JavaScript return করো (markdown ছাড়া)
- module.exports structure same রাখো
- Fragile জায়গায় try/catch যোগ করো
- Missing checks যোগ করো
- সব comment না বাদ দিও না`;

  const endpoints = [
    async () => {
      const r = await axios.post(
        "https://api.kilo.ai/api/gateway/chat/completions",
        {
          model: "kilo-auto/free",
          messages: [
            { role: "system", content: "Expert Node.js developer. Return only valid JS." },
            { role: "user", content: prompt }
          ],
          max_tokens: 1500
        },
        { headers: { "Content-Type": "application/json" }, timeout: 30000 }
      );
      return r.data?.choices?.[0]?.message?.content;
    },
    async () => {
      const r = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(prompt)}`,
        { params: { model: "openai" }, timeout: 30000 }
      );
      return typeof r.data === "string" ? r.data : null;
    }
  ];

  for (const fn of endpoints) {
    try {
      let text = await fn();
      if (!text) continue;
      text = text.replace(/^```(?:javascript|js)?\n?/i, "").replace(/\n?```\s*$/, "").trim();
      if (!text.startsWith("module.exports")) {
        const idx = text.indexOf("module.exports");
        if (idx >= 0) text = text.slice(idx);
      }
      if (text.length > 100) return text;
    } catch (_) {}
  }
  return null;
}

async function tryAutoFix(filePath, errorMsg, stack) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return false;
    if (!isAutoFixable(errorMsg)) return false;

    const originalCode = fs.readFileSync(filePath, "utf8");
    console.log(`[autoFix] Trying: ${filePath}`);

    const fixed = await askAIFix(filePath, originalCode, errorMsg, stack);
    if (!fixed || fixed.length < 50) return false;

    /* Validate syntax */
    try {
      new Function("module", "require", "exports", fixed);
    } catch (e) {
      console.warn(`[autoFix] AI's code has syntax error: ${e.message}`);
      return false;
    }

    /* Backup */
    try { fs.writeFileSync(filePath + ".backup", originalCode); } catch (_) {}

    /* Write fixed */
    fs.writeFileSync(filePath, fixed);
    console.log(`[autoFix] ✓ Fixed: ${filePath}`);
    return true;
  } catch (e) {
    console.error("[autoFix] error:", e.message);
    return false;
  }
}

module.exports = { tryAutoFix, isAutoFixable };