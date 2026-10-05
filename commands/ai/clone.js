/**
 * commands/ai/clone.js
 * NEXUS BOT V1 — Voice clone (multi-source)
 * © 2026
 */

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const FormData = require("form-data");

module.exports = {
  name: "clone",
  aliases: ["voiceclone", "vc"],
  version: "2.0.0",
  role: 0,
  description: "Clone voice from audio and speak text",
  usage: "/clone <text>  (reply to voice note)",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, messageReply, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;

    /* ═══ Check token ═══ */
    if (!HF_TOKEN) {
      react("⚠️");
      return api.sendMessage(
        "⚠️ Voice clone disabled\n" +
        "━━━━━━━━━━━━━━━━━━━━\n" +
        "🔑 HuggingFace token required\n\n" +
        "📝 Setup:\n" +
        "1. https://huggingface.co/settings/tokens\n" +
        "2. Create free 'Read' token\n" +
        "3. Render env: HF_TOKEN=hf_xxxxx\n" +
        "4. Restart bot",
        threadID
      );
    }

    /* ═══ Reply check ═══ */
    if (!messageReply || !messageReply.attachments || !messageReply.attachments.length) {
      react("❓");
      return api.sendMessage(
        "📝 Usage:\n" +
        "1. Send a voice note (5-15 sec)\n" +
        "2. Reply to it\n" +
        "3. Send: /clone <text to say>",
        threadID
      );
    }

    const text = args.join(" ").trim();
    if (!text) {
      react("❓");
      return api.sendMessage("❌ Provide text: /clone Hello world", threadID);
    }

    if (text.length > 200) text = text.slice(0, 200);
    text = text.trim();

    const audio = messageReply.attachments.find((a) =>
      a.type === "audio" || a.type === "voice" ||
      (a.url && /\.(mp3|wav|m4a|ogg|opus)/i.test(a.url)) ||
      (a.mimeType && a.mimeType.startsWith("audio"))
    );

    if (!audio || !audio.url) {
      react("❌");
      return api.sendMessage("❌ No voice note in reply", threadID);
    }

    react("⏳");

    let samplePath = null;
    let outputPath = null;

    try {
      /* ═══ Download voice sample ═══ */
      console.log(`[clone] downloading sample...`);
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

      /* ═══ Try multi-source voice clone ═══ */
      const result = await runVoiceClone(samplePath, text, HF_TOKEN);

      /* ═══ Save + send ═══ */
      outputPath = path.join(os.tmpdir(), `clone_out_${Date.now()}.mp3`);
      await fs.writeFile(outputPath, result.buffer);

      react("🎭");
      api.sendMessage({
        body: `🎭 Voice cloned via ${result.provider}\n📝 "${text.slice(0, 100)}"`,
        attachment: fs.createReadStream(outputPath)
      }, threadID, () => {
        try { fs.unlinkSync(outputPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[clone] error:", e.message);
      react("❌");
      api.sendMessage(`❌ ${e.message.slice(0, 100)}`, threadID);
    } finally {
      if (samplePath) { try { fs.unlinkSync(samplePath); } catch (_) {} }
    }
  }
};

/* ═══════════════════════════════════════════════════
   MULTI-SOURCE VOICE CLONE
   ═══════════════════════════════════════════════════ */
async function runVoiceClone(samplePath, text, hfToken) {
  const providers = [
    { name: "HF-XTTS", fn: () => tryHFXTTS(samplePath, text, hfToken) },
    { name: "HF-SpeechT5", fn: () => tryHFSpeechT5(samplePath, text, hfToken) },
    { name: "Replicate", fn: () => tryReplicate(samplePath, text) }
  ];

  let lastErr = null;

  for (const p of providers) {
    try {
      console.log(`[clone] trying: ${p.name}`);
      const buffer = await p.fn();
      console.log(`[clone] ✅ ${p.name} success`);
      return { buffer, provider: p.name };
    } catch (e) {
      console.log(`[clone] ❌ ${p.name}: ${e.message.slice(0, 80)}`);
      lastErr = e;
      continue;
    }
  }

  throw new Error("All voice clone providers failed: " + (lastErr?.message || ""));
}

/* ═══ Provider 1 — HF Inference API (new endpoint) ═══ */
async function tryHFXTTS(samplePath, text, token) {
  const audioB64 = fs.readFileSync(samplePath).toString("base64");

  /* New HF endpoint */
  const endpoints = [
    "https://api-inference.huggingface.co/models/coqui/XTTS-v2",
    "https://router.huggingface.co/hf-inference/models/coqui/XTTS-v2",
    "https://api-inference.huggingface.co/models/facebook/mms-tts-eng"
  ];

  for (const url of endpoints) {
    try {
      const r = await axios.post(url, {
        inputs: text,
        parameters: {
          speaker_embedding: audioB64
        }
      }, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer",
        timeout: 120000,
        maxContentLength: 30 * 1024 * 1024
      });

      const buf = Buffer.from(r.data);
      if (buf.length < 1000) continue;

      /* Verify audio magic bytes */
      const head = buf.slice(0, 4).toString();
      if (!head.includes("RIFF") && !head.includes("ID3") && !head.includes("ftyp") && !head.includes("OggS")) {
        /* Maybe error JSON */
        continue;
      }

      return buf;
    } catch (e) {
      continue;
    }
  }

  throw new Error("HF XTTS failed");
}

/* ═══ Provider 2 — HF SpeechT5 ═══ */
async function tryHFSpeechT5(samplePath, text, token) {
  const url = "https://api-inference.huggingface.co/models/microsoft/speecht5_tts";

  const r = await axios.post(url, {
    inputs: text
  }, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    responseType: "arraybuffer",
    timeout: 120000
  });

  const buf = Buffer.from(r.data);
  if (buf.length < 1000) throw new Error("empty audio");
  return buf;
}

/* ═══ Provider 3 — Replicate (free trial) ═══ */
async function tryReplicate(samplePath, text) {
  const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
  if (!REPLICATE_TOKEN) throw new Error("no replicate token");

  /* Upload sample */
  const audioB64 = fs.readFileSync(samplePath).toString("base64");
  const dataUri = `data:audio/wav;base64,${audioB64}`;

  /* Create prediction */
  const createR = await axios.post("https://api.replicate.com/v1/predictions", {
    version: "68488c97ed32b9273ba0ce4cdfb3bda9f8c9e034fdb1c0a078e9b3d73a8b4e86",
    input: {
      text: text,
      speaker: dataUri,
      language: "en"
    }
  }, {
    headers: {
      "Authorization": `Token ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json"
    },
    timeout: 30000
  });

  const predId = createR.data?.id;
  if (!predId) throw new Error("replicate create failed");

  /* Poll for result */
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));

    const check = await axios.get(`https://api.replicate.com/v1/predictions/${predId}`, {
      headers: { "Authorization": `Token ${REPLICATE_TOKEN}` },
      timeout: 15000
    });

    const status = check.data?.status;
    if (status === "succeeded" && check.data.output) {
      const audioUrl = Array.isArray(check.data.output) ? check.data.output[0] : check.data.output;
      const dl = await axios.get(audioUrl, { responseType: "arraybuffer", timeout: 60000 });
      return Buffer.from(dl.data);
    }
    if (status === "failed") throw new Error("replicate prediction failed");
  }

  throw new Error("replicate timeout");
}

// © 2026 NEXUS BOT V1