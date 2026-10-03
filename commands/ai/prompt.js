/**
 * commands/ai/prompt.js
 * NEXUS BOT V1 — Enhance image prompt
 * © 2026
 */

const axios = require("axios");

module.exports = {
  name: "prompt",
  aliases: ["enhance", "enhanceprompt", "imagine"],
  version: "1.1.0",
  role: 0,
  description: "Enhance your image prompt for better results",
  usage: "/prompt <short idea>",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID } = event;

    const react = (emoji) => {
      if (!messageID) return;
      try { api.setMessageReaction(emoji, messageID, threadID, () => {}); } catch (_) {}
    };

    const text = args.join(" ").trim();

    if (!text) {
      react("❓");
      return api.sendMessage("Usage: /prompt <short idea>", threadID);
    }

    react("⏳");

    try {
      const fullPrompt =
        `Expand this image prompt into a detailed, vivid description (max 40 words). ` +
        `Include style, lighting, mood, and details. Return ONLY the enhanced prompt, no explanation:\n\n` +
        `"${text}"`;

      const r = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}`,
        {
          params: { model: "openai", seed: Date.now() },
          timeout: 25000,
          headers: { "User-Agent": "Mozilla/5.0" }
        }
      );

      let enhanced = typeof r.data === "string" ? r.data : "";

      if (!enhanced || enhanced.trim().length < 5) {
        throw new Error("empty response");
      }

      /* Clean output */
      enhanced = enhanced.trim();
      enhanced = enhanced.replace(/^(Enhanced prompt|Prompt|AI|Assistant):\s*/i, "");
      enhanced = enhanced.replace(/^["']+|["']+$/g, "");
      if (enhanced.includes("\n\n")) enhanced = enhanced.split("\n\n")[0];
      if (enhanced.length > 500) enhanced = enhanced.slice(0, 497) + "...";

      react("✨");

      return api.sendMessage(
        `✨ Enhanced prompt:\n\n${enhanced}\n\n💡 Try: /genimg ${enhanced.slice(0, 200)}`,
        threadID
      );

    } catch (e) {
      console.error("[prompt] error:", e.message);

      let errLine = "unknown error";
      if (e.message.includes("timeout")) errLine = "network timeout";
      else if (e.message.includes("empty")) errLine = "empty response";
      else if (e.message.includes("ENOTFOUND")) errLine = "network unreachable";
      else errLine = e.message.slice(0, 60);

      react("❌");
      api.sendMessage(`❌ ${errLine}`, threadID);
    }
  }
};

// © 2026 NEXUS BOT V1