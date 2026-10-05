/**
 * commands/ai/clone.js
 * NEXUS BOT V1 — Voice clone via HF Spaces (real working version)
 * © 2026
 */

"use strict";

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

/* ═══════════════════════════════════════════════════════════════════
   AUDIO VALIDATOR
   ═══════════════════════════════════════════════════════════════════ */
function detectAudioExt(buf) {
  if (!buf || buf.length < 500) return null;

  const head = buf.slice(0, 12);
  const h = head.toString("hex").toLowerCase();
  const s4 = head.slice(0, 4).toString();
  const s3 = head.slice(0, 3).toString();

  if (s4 === "RIFF") return "wav";
  if (s3 === "ID3" || (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0)) return "mp3";
  if (head.slice(4, 8).toString() === "ftyp") return "m4a";
  if (s4 === "OggS") return "ogg";
  if (s4 === "fLaC") return "flac";
  return null;
}

function detectOutputAudio(buf) {
  if (!buf || buf.length < 1000) return null;
  const s4 = buf.slice(0, 4).toString();
  const s3 = buf.slice(0, 3).toString();
  if (s4 === "RIFF") return "wav";
  if (s3 === "ID3") return "mp3";
  if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return "mp3";
  if (buf.slice(4, 8).toString() === "ftyp") return "m4a";
  if (s4 === "OggS") return "ogg";
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   HF SPACES VOICE CLONE via @gradio/client
   ═══════════════════════════════════════════════════════════════════ */
let _gradioClient = null;
function getGradioClient() {
  if (_gradioClient) return _gradioClient;
  try {
    const mod = require("@gradio/client");
    _gradioClient = mod.Client || mod.default?.Client;
    return _gradioClient;
  } catch (e) {
    console.log("[clone] @gradio/client not installed:", e.message);
    return null;
  }
}

/* Known good XTTS Spaces (public, no token needed for basic use) */
const XTTS_SPACES = [
  {
    space: "coqui/XTTS-v2",
    apiName: "/predict",
    /* args: [text, language, speaker_wav_file] */
    buildArgs: (text, lang, audioBlob) => [text, lang, audioBlob]
  },
  {
    space: "mrfakename/E2-F5-TTS",
    apiName: "/infer",
    buildArgs: (text, lang, audioBlob) => [text, audioBlob]
  },
  {
    space: "Zoidberg/XTTS",
    apiName: "/predict",
    buildArgs: (text, lang, audioBlob) => [text, lang, audioBlob]
  }
];

async function tryHFSpace(samplePath, text, sampleExt) {
  const Client = getGradioClient();
  if (!Client) throw new Error("@gradio/client not installed");

  /* Read sample as Blob */
  const audioBuf = fs.readFileSync(samplePath);
  const mimeType =
    sampleExt === "wav" ? "audio/wav" :
    sampleExt === "mp3" ? "audio/mpeg" :
    sampleExt === "m4a" ? "audio/mp4" :
    sampleExt === "ogg" ? "audio/ogg" : "audio/wav";

  const BlobClass = (typeof Blob !== "undefined") ? Blob : require("buffer").Blob;
  const audioBlob = new BlobClass([audioBuf], { type: mimeType });

  let lastErr = null;

  for (const cfg of XTTS_SPACES) {
    try {
      console.log(`[clone] connecting HF Space: ${cfg.space}`);

      const client = await Client.connect(cfg.space, {
        hf_token: process.env.HF_TOKEN ? `hf_token=${process.env.HF_TOKEN}` : undefined
      });

      const args = cfg.buildArgs(text, "en", audioBlob);
      console.log(`[clone] calling ${cfg.apiName} on ${cfg.space}`);

      const result = await client.predict(cfg.apiName, args);

      /* Result may be { data: [...] } with url or path */
      const data = result?.data || result;
      const firstOut = Array.isArray(data) ? data[0] : data;

      if (!firstOut) throw new Error("empty result");

      let audioUrl = null;

      if (typeof firstOut === "string") {
        audioUrl = firstOut;
      } else if (firstOut && typeof firstOut === "object") {
        audioUrl = firstOut.url || firstOut.path || firstOut.name;
      }

      if (!audioUrl) throw new Error("no audio url in result");

      /* If local path, read it; else download */
      if (/^https?:\/\//i.test(audioUrl)) {
        const dl = await axios.get(audioUrl, {
          responseType: "arraybuffer",
          timeout: 60000,
          maxContentLength: 30 * 1024 * 1024
        });
        const buf = Buffer.from(dl.data);
        if (!detectOutputAudio(buf)) throw new Error("invalid output audio");
        console.log(`[clone] ✅ ${cfg.space} → ${(buf.length / 1024).toFixed(0)} KB`);
        return buf;
      } else {
        /* Local file path returned by Gradio */
        if (fs.existsSync(audioUrl)) {
          const buf = fs.readFileSync(audioUrl);
          if (!detectOutputAudio(buf)) throw new Error("invalid output audio");
          console.log(`[clone] ✅ ${cfg.space} (local) → ${(buf.length / 1024).toFixed(0)} KB`);
          return buf;
        }
      }

      throw new Error("could not resolve output");
    } catch (e) {
      console.log(`[clone] ${cfg.space} failed: ${e.message.slice(0, 120)}`);
      lastErr = e;
    }
  }

  throw lastErr || new Error("all HF spaces failed");
}

/* ═══════════════════════════════════════════════════════════════════
   PROVIDER 2: Replicate (fallback, needs token)
   ═══════════════════════════════════════════════════════════════════ */
async function tryReplicate(samplePath, text) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("no REPLICATE_API_TOKEN");

  const audioB64 = fs.readFileSync(samplePath).toString("base64");
  const dataUri = `data:audio/wav;base64,${audioB64}`;

  /* XTTS-v2 Replicate version */
  const createR = await axios.post(
    "https://api.replicate.com/v1/predictions",
    {
      version: "68488c97ed32b9273ba0ce4cdfb3bda9f8c9e034fdb1c0a078e9b3d73a8b4e86",
      input: {
        text,
        speaker: dataUri,
        language: "en",
        cleanup_voice: false
      }
    },
    {
      headers: {
        "Authorization": `Token ${token}`,
        "Content-Type": "application/json"
      },
      timeout: 30000
    }
  );

  const predId = createR.data?.id;
  if (!predId) throw new Error("replicate create failed");

  /* Poll */
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000));

    const check = await axios.get(
      `https://api.replicate.com/v1/predictions/${predId}`,
      {
        headers: { Authorization: `Token ${token}` },
        timeout: 15000
      }
    );

    const status = check.data?.status;
    if (status === "succeeded" && check.data.output) {
      const audioUrl = Array.isArray(check.data.output)
        ? check.data.output[0]
        : check.data.output;
      const dl = await axios.get(audioUrl, {
        responseType: "arraybuffer",
        timeout: 60000
      });
      const buf = Buffer.from(dl.data);
      if (!detectOutputAudio(buf)) throw new Error("invalid replicate output");
      console.log(`[clone] ✅ Replicate → ${(buf.length / 1024).toFixed(0)} KB`);
      return buf;
    }
    if (status === "failed") {
      throw new Error("replicate prediction failed: " + (check.data.error || ""));
    }
  }
  throw new Error("replicate timeout");
}

/* ═══════════════════════════════════════════════════════════════════
   MASTER
   ═══════════════════════════════════════════════════════════════════ */
async function runVoiceClone(samplePath, text, sampleExt) {
  const providers = [
    { name: "HF-Spaces",  fn: () => tryHFSpace(samplePath, text, sampleExt) },
    { name: "Replicate",  fn: () => tryReplicate(samplePath, text) }
  ];

  let lastErr = null;

  for (const p of providers) {
    try {
      console.log(`[clone] trying ${p.name}...`);
      const buffer = await p.fn();
      return { buffer, provider: p.name };
    } catch (e) {
      console.log(`[clone] ${p.name} err: ${e.message.slice(0, 120)}`);
      lastErr = e;
    }
  }

  throw new Error(
    "All providers failed: " + (lastErr?.message || "unknown")
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════════════ */
module.exports = {
  name: "clone",
  aliases: ["voiceclone", "vc"],
  version: "3.0.0",
  role: 0,
  description: "Clone voice from audio and speak text (HF Spaces)",
  usage: "/clone <text>  (reply to voice note)",
  category: "ai",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, messageReply, senderID } = event;

    const react = (e) => {
      if (messageID) {
        try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
      }
    };

    /* Reply check */
    if (!messageReply || !messageReply.attachments || !messageReply.attachments.length) {
      react("❓");
      return api.sendMessage(
        `🎭 VOICE CLONE\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📝 How to use:\n` +
        `1. Send a voice note (5-15 sec)\n` +
        `2. Reply to that voice note\n` +
        `3. Send: /clone <text to say>\n\n` +
        `📌 Example:\n` +
        `   /clone Hello world, this is my voice`,
        threadID
      );
    }

    const text = (args || []).join(" ").trim();
    if (!text) {
      react("❓");
      return api.sendMessage(`❌ Text dao: /clone Hello world`, threadID);
    }

    /* Find audio attachment */
    const audio = messageReply.attachments.find((a) =>
      a.type === "audio" ||
      a.type === "voice" ||
      (a.url && /\.(mp3|wav|m4a|ogg|opus|flac)/i.test(a.url)) ||
      (a.mimeType && a.mimeType.startsWith("audio"))
    );

    if (!audio || !audio.url) {
      react("❌");
      return api.sendMessage(`❌ Reply-te voice note pai ni`, threadID);
    }

    react("⏳");

    let samplePath = null;
    let outputPath = null;

    try {
      /* Download sample */
      console.log(`[clone] downloading sample...`);
      const dl = await axios.get(audio.url, {
        responseType: "arraybuffer",
        timeout: 30000,
        maxContentLength: 25 * 1024 * 1024,
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const sampleBuf = Buffer.from(dl.data);
      if (sampleBuf.length < 2000) throw new Error("sample too small");

      const sampleExt = detectAudioExt(sampleBuf) || "wav";
      samplePath = path.join(os.tmpdir(), `clone_sample_${Date.now()}.${sampleExt}`);
      await fs.writeFile(samplePath, sampleBuf);

      console.log(`[clone] sample: ${(sampleBuf.length / 1024).toFixed(1)} KB (${sampleExt})`);

      /* Text length limit for XTTS */
      let finalText = text;
      if (finalText.length > 300) finalText = finalText.slice(0, 300);

      /* Run clone */
      const result = await runVoiceClone(samplePath, finalText, sampleExt);

      /* Save + send */
      const outExt = detectOutputAudio(result.buffer) || "wav";
      outputPath = path.join(os.tmpdir(), `clone_out_${Date.now()}.${outExt}`);
      await fs.writeFile(outputPath, result.buffer);

      react("🎭");
      api.sendMessage({
        body: `🎭 Voice cloned via ${result.provider}\n📝 "${finalText.slice(0, 100)}"`,
        attachment: fs.createReadStream(outputPath)
      }, threadID, (err) => {
        try { fs.unlinkSync(outputPath); } catch (_) {}
        if (err) console.error("[clone] send err:", err.message);
      });

    } catch (e) {
      console.error("[clone] error:", e.message);
      react("❌");

      /* Helpful error messages */
      let msg = e.message;
      if (e.message.includes("@gradio/client")) {
        msg = "Setup needed: run 'npm install @gradio/client' and redeploy";
      } else if (e.message.includes("all HF spaces failed") || e.message.includes("All providers")) {
        msg =
          "Voice clone APIs busy. Try again in 1-2 minutes.\n" +
          "💡 For better reliability, set REPLICATE_API_TOKEN env var.";
      } else if (e.message.includes("timeout")) {
        msg = "Request timeout — try shorter text or wait";
      } else {
        msg = msg.slice(0, 150);
      }

      api.sendMessage(`❌ ${msg}`, threadID);
    } finally {
      if (samplePath) { try { fs.unlinkSync(samplePath); } catch (_) {} }
    }
  }
};

// © 2026 NEXUS BOT V1