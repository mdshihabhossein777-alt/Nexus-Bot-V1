// commands/utility/fbinfo.js - NEXUS V1 - Full Profile + AI Gender Detect
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

/* ---------- HTML entity decode ---------- */
function decodeEntities(str) {
  if (!str) return "";
  return String(str)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(d))
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u([0-9a-f]{4})/gi, (m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');
}

/* ---------- Get bot cookies ---------- */
function getCookies(api) {
  let cookieStr = "";

  try {
    if (api && typeof api.getAppState === "function") {
      const appState = api.getAppState() || [];
      cookieStr = appState
        .filter((c) => c && c.key && c.value)
        .map((c) => `${c.key}=${c.value}`)
        .join("; ");
    }
  } catch (_) {}

  if (!cookieStr) {
    try {
      const appStateFile = path.join(__dirname, "..", "..", "appstate.json");
      if (fs.existsSync(appStateFile)) {
        const appState = fs.readJsonSync(appStateFile);
        if (Array.isArray(appState)) {
          cookieStr = appState
            .filter((c) => c && c.key && c.value)
            .map((c) => `${c.key}=${c.value}`)
            .join("; ");
        }
      }
    } catch (_) {}
  }

  return cookieStr;
}

/* ---------- Fetch with cookies ---------- */
async function fetchWithCookies(url, api) {
  const cookieStr = getCookies(api);

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache"
  };

  if (cookieStr) headers["Cookie"] = cookieStr;

  const r = await axios.get(url, {
    headers,
    timeout: 25000,
    maxRedirects: 5,
    validateStatus: () => true
  });
  return typeof r.data === "string" ? r.data : "";
}

/* ================================================================
   🤖 AI-BASED GENDER DETECTION
   ================================================================ */
async function aiGenderDetect(name) {
  if (!name || name === "Unknown") return null;

  try {
    const prompt = `Based on the name "${name}", determine the most likely gender.
Consider Bengali, Hindi, Arabic, English and other cultures.
Reply with ONLY one of these exact words: "Male", "Female", or "Unknown".
Do NOT include any other text, explanation or punctuation.

Name: ${name}
Gender:`;

    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`;

    const r = await axios.get(url, { timeout: 20000 });
    let text = typeof r.data === "string" ? r.data : "";

    /* Clean and parse */
    text = text.toLowerCase().trim();

    /* Extract first valid word */
    if (text.includes("female")) return "Female ♀️ (AI)";
    if (text.includes("male") && !text.includes("female")) return "Male ♂️ (AI)";

    return null;
  } catch (e) {
    console.warn("[fbinfo] AI gender failed:", e.message);
    return null;
  }
}

/* ---------- Extract profile info from HTML ---------- */
function extractProfile(html) {
  const result = {
    name: null, bio: null, vanity: null,
    followers: null, following: null,
    profilePic: null, coverPic: null,
    work: null, education: null,
    location: null, hometown: null,
    birthday: null, relationship: null,
    website: null, gender: null,
    languages: null, quotes: null, joined: null
  };

  if (!html) return result;

  /* ---- Name ---- */
  let m = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
  if (m && m[1]) result.name = decodeEntities(m[1]);

  /* ---- Bio ---- */
  m = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i);
  if (m && m[1]) result.bio = decodeEntities(m[1]);

  /* ---- Profile Pic ---- */
  m = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
  if (m && m[1]) result.profilePic = decodeEntities(m[1]);

  /* ---- Vanity ---- */
  m = html.match(/"vanity":"([^"]+)"/);
  if (m && m[1]) result.vanity = m[1];

  /* ---- Gender ---- */
  const genderPatterns = [
    /"gender":(\d+)/,
    /"gender":"([^"]+)"/,
    /"sex":(\d+)/,
    /"sex":"([^"]+)"/
  ];
  for (const p of genderPatterns) {
    const gm = html.match(p);
    if (gm && gm[1]) {
      const v = String(gm[1]).toLowerCase();
      if (v === "2" || v === "male" || v === "m") { result.gender = "Male ♂️"; break; }
      if (v === "1" || v === "female" || v === "f") { result.gender = "Female ♀️"; break; }
    }
  }

  /* ---- Followers ---- */
  const folP = [/([\d.,]+[KMB]?)\s+(?:followers|people follow)/i, /"follower_count":(\d+)/];
  for (const p of folP) {
    const fm = html.match(p);
    if (fm && fm[1]) { result.followers = fm[1]; break; }
  }

  /* ---- Following ---- */
  const fwingP = [/([\d.,]+[KMB]?)\s+following/i, /"following_count":(\d+)/];
  for (const p of fwingP) {
    const fm = html.match(p);
    if (fm && fm[1]) { result.following = fm[1]; break; }
  }

  /* ---- Work ---- */
  const workP = [/"work":\[\{[^}]*"name":"([^"]+)"/, /"employer":\{"name":"([^"]+)"/];
  for (const p of workP) {
    const wm = html.match(p);
    if (wm && wm[1]) { result.work = decodeEntities(wm[1]); break; }
  }

  /* ---- Education ---- */
  const eduP = [/"education":\[\{[^}]*"name":"([^"]+)"/, /"school":\{"name":"([^"]+)"/];
  for (const p of eduP) {
    const em = html.match(p);
    if (em && em[1]) { result.education = decodeEntities(em[1]); break; }
  }

  /* ---- Location ---- */
  const locP = [/"location":\{"name":"([^"]+)"/, /"current_city":"([^"]+)"/];
  for (const p of locP) {
    const lm = html.match(p);
    if (lm && lm[1]) { result.location = decodeEntities(lm[1]); break; }
  }

  /* ---- Hometown ---- */
  const homeP = [/"hometown":\{"name":"([^"]+)"/];
  for (const p of homeP) {
    const hm = html.match(p);
    if (hm && hm[1]) { result.hometown = decodeEntities(hm[1]); break; }
  }

  /* ---- Birthday ---- */
  const bP = [/"birthday":"([^"]+)"/, /"birth_date":"([^"]+)"/];
  for (const p of bP) {
    const bm = html.match(p);
    if (bm && bm[1]) { result.birthday = decodeEntities(bm[1]); break; }
  }

  /* ---- Relationship ---- */
  const relP = [/"relationship_status":"([^"]+)"/, /"relationship":\{"name":"([^"]+)"/];
  for (const p of relP) {
    const rm = html.match(p);
    if (rm && rm[1]) { result.relationship = decodeEntities(rm[1]); break; }
  }

  /* ---- Website ---- */
  const webP = [/"website":"([^"]+)"/, /"websites":\["([^"]+)"/];
  for (const p of webP) {
    const wm = html.match(p);
    if (wm && wm[1]) { result.website = decodeEntities(wm[1]); break; }
  }

  /* ---- Languages ---- */
  const langP = [/"languages":\[([^\]]+)\]/];
  for (const p of langP) {
    const lm = html.match(p);
    if (lm && lm[1]) {
      let langs = lm[1].replace(/[\[\]"]/g, "").trim();
      if (langs.length > 80) langs = langs.slice(0, 77) + "...";
      result.languages = decodeEntities(langs);
      break;
    }
  }

  /* ---- Joined ---- */
  const jP = [/"joined":"([^"]+)"/, /Joined\s+([A-Za-z]+\s+\d{4})/i];
  for (const p of jP) {
    const jm = html.match(p);
    if (jm && jm[1]) { result.joined = decodeEntities(jm[1]); break; }
  }

  return result;
}

/* ================================================================
   MAIN MODULE
   ================================================================ */
module.exports = {
  name: "fbinfo",
  aliases: ["fbprofile", "fbp", "whois", "profile2"],
  version: "4.0.0",
  role: 0,
  description: "Full Facebook profile info with AI gender detect",
  usage: "/fbinfo @user  |  /fbinfo <facebook-url>  |  /fbinfo <uid>",
  execute: async function (api, event, args, db) {
    const { threadID, senderID, mentions, messageReply } = event;

    try {
      /* ---- Resolve target ---- */
      let target = String(senderID);
      let profileUrl = null;

      /* Case 1: URL */
      const urlArg = args.find((a) => /facebook\.com|fb\.com|fb\.me/i.test(a));
      if (urlArg) {
        profileUrl = urlArg;
        const uidMatch = urlArg.match(/[?&]id=(\d+)/);
        const vanityMatch = urlArg.match(/facebook\.com\/([A-Za-z0-9._-]+)/);
        if (uidMatch) target = uidMatch[1];
        else if (vanityMatch && !["profile.php", "people", "pages"].includes(vanityMatch[1])) {
          target = vanityMatch[1];
        }
      }
      /* Case 2: UID argument */
      else if (args[0] && /^\d{6,}$/.test(args[0])) {
        target = args[0];
      }
      /* Case 3: Mention/Reply */
      else {
        const ids = Object.keys(mentions || {});
        if (ids.length) target = String(ids[0]);
        else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);
      }

      if (!target) {
        return api.sendMessage(
          `📝 Usage:\n/fbinfo @user\n/fbinfo https://facebook.com/username\n/fbinfo 61577562306224`,
          threadID
        );
      }

      /* Initial message + react */
      const sentMsg = await api.sendMessage("🔍 Fetching profile info...", threadID);
      const sentMsgID = sentMsg && sentMsg.messageID;
      if (sentMsgID) {
        try { api.setMessageReaction("⏳", sentMsgID, threadID, () => {}); } catch (_) {}
      }

      /* ---- 1. FCA basic info ---- */
      let name = "Unknown";
      let gender = "Unknown";
      let fcaVanity = null;
      let fcaUrl = `https://facebook.com/${target}`;

      try {
        const info = await api.getUserInfo(target);
        if (info && info[target]) {
          const u = info[target];
          if (u.name) name = u.name;
          if (u.vanity) {
            fcaVanity = u.vanity;
            fcaUrl = `https://facebook.com/${u.vanity}`;
          }
          if (u.gender === 2) gender = "Male ♂️";
          else if (u.gender === 1) gender = "Female ♀️";
        }
      } catch (_) {}

      /* ---- 2. Scrape profile ---- */
      let profileData = {};
      try {
        const html = await fetchWithCookies(profileUrl || fcaUrl, api);
        profileData = extractProfile(html);
      } catch (e) {
        console.warn("[fbinfo] scrape failed:", e.message);
      }

      /* ---- 3. Final values ---- */
      const finalName = profileData.name || name;
      const finalVanity = profileData.vanity || fcaVanity;
      const finalGender = profileData.gender || gender;

      /* ---- 4. ⚡ AI GENDER DETECT (if unknown) ---- */
      let genderFinal = finalGender;
      if (!genderFinal || genderFinal === "Unknown") {
        console.log(`[fbinfo] gender unknown for "${finalName}", using AI...`);
        const aiGender = await aiGenderDetect(finalName);
        if (aiGender) genderFinal = aiGender;
      }

      /* ---- 5. Profile link ---- */
      const profileLink = finalVanity
        ? `https://facebook.com/${finalVanity}`
        : (profileUrl || fcaUrl);

      /* ---- 6. Build response ---- */
      const lines = [];
      lines.push(`📘 FACEBOOK PROFILE`);
      lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
      lines.push(`📛 Name: ${finalName}`);
      lines.push(`🆔 UID: ${target}`);
      if (finalVanity) lines.push(`🌐 Username: @${finalVanity}`);
      lines.push(`🔗 Link: ${profileLink}`);
      lines.push(`⚧ Gender: ${genderFinal}`);

      if (profileData.bio && !/^facebook/i.test(profileData.bio)) {
        lines.push(`📝 Bio: ${profileData.bio.slice(0, 120)}`);
      }
      if (profileData.followers) lines.push(`👥 Followers: ${profileData.followers}`);
      if (profileData.following) lines.push(`➡️ Following: ${profileData.following}`);
      if (profileData.work) lines.push(`💼 Work: ${profileData.work}`);
      if (profileData.education) lines.push(`🎓 Education: ${profileData.education}`);
      if (profileData.location) lines.push(`📍 Location: ${profileData.location}`);
      if (profileData.hometown) lines.push(`🏠 Hometown: ${profileData.hometown}`);
      if (profileData.birthday) lines.push(`🎂 Birthday: ${profileData.birthday}`);
      if (profileData.relationship) lines.push(`💑 Relationship: ${profileData.relationship}`);
      if (profileData.languages) lines.push(`🗣️ Languages: ${profileData.languages}`);
      if (profileData.website) lines.push(`🌐 Website: ${profileData.website}`);
      if (profileData.joined) lines.push(`📅 Joined: ${profileData.joined}`);

      lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);
      lines.push(`✨ Powered by Shihab ✨`);

      /* React ✅ */
      if (sentMsgID) {
        try { api.setMessageReaction("✅", sentMsgID, threadID, () => {}); } catch (_) {}
      }

      api.sendMessage(lines.join("\n"), threadID);

    } catch (e) {
      console.error("[fbinfo] error:", e.message);
      api.sendMessage("❌ Error: " + e.message, threadID);
    }
  }
};
// Powered by Shihab