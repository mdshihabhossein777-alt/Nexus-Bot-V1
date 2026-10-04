/**
 * commands/ai/clone.js
 * NEXUS BOT V1 — Voice clone using Hugging Face API
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

module.exports = {
  name: "clone",
  aliases: ["voiceclone", "vc"],
  version: "1.0.0",
  role: 0,
  description: "Clone voice from audio reply and speak text",
  usage: "/clone <text>  (reply to a voice note)",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, messageReply } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Check HF token ═══ */
    const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;

    if (!HF_TOKEN) {
      react("⚠️");
      return api.sendMessage(
        `⚠️ Voice clone disabled\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🔑 HuggingFace token required\n\n` +
        `📝 Setup:\n` +
        `1. Go to huggingface.co/settings/tokens\n` +
        `2. Create free read token\n` +
        `3. Add to Render env var:\n` +
        `   HF_TOKEN=hf_xxxxx\n\n` +
        `💡 Then restart bot`,
        threadID
      );
    }

    /* ═══ Reply check ═══ */
    if (!messageReply || !messageReply.attachments || !messageReply.attachments.length) {
      react("❓");
      return api.sendMessage(
        `📝 Usage:\n` +
        `1. Send a voice note to bot\n` +
        `2. Reply to that voice note\n` +
        `3. Send: /clone <text to speak>\n\n` +
        `💡 Bot will clone the voice and speak your text`,
        threadID
      );
    }

    const text = args.join(" ").trim();
    if (!text) {
      react("❓");
      return api.sendMessage("❌ Provide text: /clone Hello World", threadID);
    }

    if (text.length > 250) {
      return api.sendMessage("❌ Text too long (max 250 chars)", threadID);
    }

    /* ═══ Find audio attachment ═══ */
    const audio = messageReply.attachments.find((a) =>
      a.type === "audio" ||
      a.type === "voice" ||
      (a.url && /\.(mp3|wav|m4a|ogg|opus)/i.test(a.url)) ||
      (a.mimeType && a.mimeType.startsWith("audio"))
    );

    if (!audio || !audio.url) {
      react("❌");
      return api.sendMessage("❌ No audio found in reply", threadID);
    }

    react("⏳");

    let samplePath = null;
    let outputPath = null;

    try {
      /* ═══ Download voice sample ═══ */
      console.log(`[clone] downloading sample: ${audio.url.slice(0, 60)}`);

      const dl = await axios.get(audio.url, {
        responseType: "arraybuffer",
        timeout: 30000,
        maxContentLength: 25 * 1024 * 1024,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const sampleBuf = Buffer.from(dl.data);
      if (sampleBuf.length < 2000) throw new Error("sample too small");

      samplePath = path.join(os.tmpdir(), `clone_sample_${Date.now()}.wav`);
      await fs.writeFile(samplePath, sampleBuf);

      console.log(`[clone] sample: ${(sampleBuf.length / 1024).toFixed(1)} KB`);

      /* ═══ Call Hugging Face XTTS API ═══ */
      const modelUrl = "https://api-inference.huggingface.co/models/coqui/XTTS-v2";

      /* Prepare multipart form data */
      const FormData = require("form-data");
      const form = new FormData();
      form.append("data", fs.createReadStream(samplePath));
      form.append("text", text);
      form.append("language", "en");

      console.log(`[clone] sending to HF...`);

      const response = await axios.post(modelUrl, form, {
        headers: {
          ...form.getHeaders(),
          "Authorization": `Bearer ${HF_TOKEN}`
        },
        responseType: "arraybuffer",
        timeout: 120000,
        maxContentLength: 30 * 1024 * 1024
      });

      const audioBuf = Buffer.from(response.data);
      if (audioBuf.length < 1000) throw new Error("HF returned empty audio");

      console.log(`[clone] result: ${(audioBuf.length / 1024).toFixed(1)} KB`);

      outputPath = path.join(os.tmpdir(), `clone_output_${Date.now()}.mp3`);
      await fs.writeFile(outputPath, audioBuf);

      react("🎭");
      api.sendMessage({
        body: `🎭 Voice cloned!\n📝 Text: "${text.slice(0, 100)}"`,
        attachment: fs.createReadStream(outputPath)
      }, threadID, () => {
        try { fs.unlinkSync(outputPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[clone] error:", e.message);

      let errLine = "clone failed";
      if (e.response?.status === 401) errLine = "invalid HF token";
      else if (e.response?.status === 503) errLine = "HF model loading, try again in 30s";
      else if (e.response?.status === 429) errLine = "rate limit, wait 1 min";
      else if (e.message.includes("timeout")) errLine = "timeout — try shorter text";
      else if (e.message.includes("too small")) errLine = "voice sample too small";
      else errLine = e.message.slice(0, 60);

      react("❌");
      api.sendMessage(`❌ ${errLine}`, threadID);

    } finally {
      if (samplePath) { try { fs.unlinkSync(samplePath); } catch (_) {} }
      if (outputPath) { try { fs.unlinkSync(outputPath); } catch (_) {} }
    }
  }
};

// © 2026 NEXUS BOT V1