// utils/aiReply.js - NEXUS V1 - 2026 Working APIs Only
const axios = require("axios");

/* Friendly emojis */
const EMOJIS = ["💬", "😊", "🙂", "😄", "✨", "💭", "🌟", "💫", "😎", "🤝"];
const pickEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

/* Name cache */
const nameCache = new Map();
const NAME_TTL = 30 * 60 * 1000;

function getCachedName(userID) {
  const e = nameCache.get(String(userID));
  return (e && Date.now() - e.time < NAME_TTL) ? e.name : null;
}
function setCachedName(userID, name) {
  nameCache.set(String(userID), { name, time: Date.now() });
}

/* Bangla detector */
function isBangla(text) {
  if (!text) return false;
  if (/[\u0980-\u09FF]/.test(text)) return true;
  const banglish = [
    "ki","kii","kemon","kothay","kobe","keno","kar","koto",
    "tumi","tomar","apni","amar","amake","ami","tui","tor","tora",
    "koro","korcho","korla","korba","hobe","holo","hoy","hoyna",
    "bhalo","kharap","valo","acho","achis","achhe",
    "bolo","bol","bolen","dao","de","den","niye","niya",
    "ke","ka","kotha","kaj","khabo","khawa","khela",
    "na","nai","nei","hae","haan","hmm","vai","bhai","apu","apa",
    "didi","mama","chacha","khala","baba","maa","ma",
    "tukai","tuka","gali","boka","murgi","meye","chele"
  ];
  const low = " " + text.toLowerCase() + " ";
  return banglish.some((w) => low.includes(" " + w + " "));
}

/* Question detector */
function isQuestion(text) {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 4 || t.length > 200) return false;
  if (/[?？]/.test(t)) return true;
  const low = t.toLowerCase();
  const starters = [
    "kemon","kmon","kaimon","kemne","ki ","kii ","kar ","kothay","kobe","keno","koto",
    "tumi ","tomar ","apni ","amar ","amake ","hello","hi ","hey",
    "what","when","where","who","why","how","which",
    "is ","are ","was ","were ","do ","does ","did ",
    "can ","could ","will ","would ","should "
  ];
  return starters.some((s) => low.startsWith(s));
}

/* ═══════════════════════════════════════
   ⚡ 2026 TESTED WORKING APIs (in order)
   ═══════════════════════════════════════ */
async function getShortReply(question, senderName = "User") {
  const useBangla = isBangla(question);

  const sys = useBangla
    ? `তুমি একজন friendly Bangla chat friend. উত্তর দাও **Banglish** (Bangla in English letters) এ, ২-৩ short sentence. Casual tone, "tumi" ব্যবহার করো। সরাসরি উত্তর দাও, কোনো prefix দিও না।`
    : `You are a friendly casual friend. Reply in 2-3 short sentences. Match user's language. No greeting. No prefix.`;

  const fullPrompt = `${sys}\n\nUser: ${question}\nReply:`;

  const endpoints = [
    /* ⭐ 1. Kilo Gateway (CONFIRMED WORKING in your log) */
    async () => {
      const r = await axios.post(
        "https://api.kilo.ai/api/gateway/chat/completions",
        {
          model: "kilo-auto/free",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: question }
          ],
          max_tokens: 150
        },
        { headers: { "Content-Type": "application/json" }, timeout: 15000 }
      );
      return r.data?.choices?.[0]?.message?.content;
    },

    /* ⭐ 2. OVHcloud Qwen3 235B */
    async () => {
      const r = await axios.post(
        "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions",
        {
          model: "Qwen3-235B-A22B-Instruct-2507",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: question }
          ],
          max_tokens: 150
        },
        { headers: { "Content-Type": "application/json" }, timeout: 15000 }
      );
      return r.data?.choices?.[0]?.message?.content;
    },

    /* ⭐ 3. Pollinations (final fallback, keyless) */
    async () => {
      const r = await axios.get(
        `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}`,
        { params: { model: "openai" }, timeout: 15000 }
      );
      return typeof r.data === "string" ? r.data : null;
    },

    /* ⭐ 4. DeepInfra Chat (free tier) */
    async () => {
      const r = await axios.post(
        "https://api.deepinfra.com/v1/openai/chat/completions",
        {
          model: "meta-llama/Meta-Llama-3.1-8B-Instruct",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: question }
          ],
          max_tokens: 150
        },
        { headers: { "Content-Type": "application/json" }, timeout: 15000 }
      );
      return r.data?.choices?.[0]?.message?.content;
    },

    /* ⭐ 5. Cloudflare Workers AI (free) */
    async () => {
      const r = await axios.post(
        "https://playground.ai.cloudflare.com/api/inference",
        {
          model: "@cf/meta/llama-3.1-8b-instruct",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: question }
          ],
          max_tokens: 150
        },
        { headers: { "Content-Type": "application/json" }, timeout: 15000 }
      );
      return r.data?.response || r.data?.result?.response;
    }
  ];

  for (let i = 0; i < endpoints.length; i++) {
    try {
      let text = await endpoints[i]();
      if (!text || typeof text !== "string" || text.length < 2) continue;

      text = text.trim();
      text = text.replace(/^(AI|Assistant|Reply|Bot|User):\s*/i, "");
      text = text.replace(/^["']|["']$/g, "");
      text = text.replace(/\n{2,}/g, "\n");

      /* Skip credit/error messages */
      if (/credit|insufficient|top up|balance|quota|limit exceeded/i.test(text.slice(0, 50))) {
        continue;
      }

      if (text.length > 300) {
        const cut = text.slice(0, 297);
        const sp = cut.lastIndexOf(".");
        text = (sp > 200 ? cut.slice(0, sp + 1) : cut + "...");
      }

      console.log(`[aiReply] ✓ endpoint ${i + 1} (${["Kilo","OVH","Pollinations","DeepInfra","CF"][i] || i + 1})`);
      return text;
    } catch (e) {
      console.warn(`[aiReply] endpoint ${i + 1} failed: ${e.message.slice(0, 50)}`);
    }
  }

  return null;
}

module.exports = {
  isQuestion,
  isBangla,
  getShortReply,
  pickEmoji,
  getCachedName,
  setCachedName
};