// organize.js - Auto-sort commands into category folders
// Usage: node organize.js
// Run ONCE from project root

const fs = require("fs-extra");
const path = require("path");

const COMMANDS_DIR = path.join(__dirname, "commands");

/* ================================================================
   CATEGORY MAP — কোন command কোন folder এ যাবে
   ================================================================ */
const CATEGORY_MAP = {
  admin: [
    "kick","ban","unban","warn","unwarn","warnings",
    "antilink","antibot","antispam","welcome","goodbye","setwelcome",
    "adminlist","groupname","groupemoji","groupimg",
    "mute","unmute","poll","votekick",
    "setprefix","prefix","rules","setrules",
    "resend","ghost","leftnoti","joinnoti","autoseen",
    "pin","unpin","allkick","allnick","botnick",
    "locknick","unlocknick","adminonly","onlyadmin"
  ],
  economy: [
    "balance","bal","daily","work","weekly","monthly",
    "bank","deposit","withdraw","transfer","pay",
    "top","rich","leaderboard","shop","buy","sell",
    "inventory","inv","gamble","slot","coinflip","dice","blackjack",
    "lottery","cash","income","job","joblist",
    "hunt","fish","mine","farm","crime","rob"
  ],
  ai: [
    "ai","gpt","gemini","chat","bby","simsimi","blackbox",
    "imagine","art","draw","genimg","flux","turbo","stable",
    "tts","translate","trans","grammar","summarize","ask",
    "pollinations","prompt","imagen","remini","bgremove",
    "toanime","tocartoon","upscale","enhance",
    "copilot","dalle","bing","prodia"
  ],
  fun: [
    "meme","joke","roast","pickupline","flirt","8ball",
    "truth","dare","ship","couple","hug","kiss","slap","pat",
    "waifu","neko","anime","cosplay","quote","fact",
    "riddle","quiz","trivia","wouldyou","confessions","crush",
    "prettycheck","lovecheck","iq","horoscope","zodiac"
  ],
  utility: [
    "weather","time","calc","math","calendar",
    "qr","qrcode","shortlink","ip","ipinfo",
    "uid","tid","userinfo","groupinfo","threadinfo","profile",
    "fbinfo","github","dictionary","wikipedia","wiki",
    "google","search","imagesearch","screenshot","ss",
    "linkcheck","uptime","ping","stats","botstats",
    "version","info","menu","rank","globalrank","note","remind"
  ],
  download: [
    "autodl"
  ],
  owner: [
    "setrank","setbotnick","reload","restart"
  ]
};

/* ================================================================
   MAIN SCRIPT
   ================================================================ */
function organize() {
  console.log("\n🚀 NEXUS BOT V1 — Command Organizer\n");
  console.log("═".repeat(50));

  if (!fs.existsSync(COMMANDS_DIR)) {
    console.error("❌ commands/ folder not found!");
    process.exit(1);
  }

  /* 1. Create all category folders */
  console.log("\n📁 Creating folders...\n");
  for (const cat of Object.keys(CATEGORY_MAP)) {
    const dir = path.join(COMMANDS_DIR, cat);
    fs.ensureDirSync(dir);
    console.log(`   ✅ commands/${cat}/`);
  }

  /* 2. Build reverse lookup: filename → category */
  const fileToCat = {};
  for (const [cat, files] of Object.entries(CATEGORY_MAP)) {
    for (const f of files) {
      fileToCat[`${f}.js`] = cat;
    }
  }

  /* 3. Scan flat files in commands/ root */
  console.log("\n📦 Moving files...\n");
  const entries = fs.readdirSync(COMMANDS_DIR);
  let moved = 0, skipped = 0, unknown = [];

  for (const name of entries) {
    const full = path.join(COMMANDS_DIR, name);

    /* Skip directories */
    if (fs.statSync(full).isDirectory()) continue;
    if (!name.endsWith(".js")) continue;

    const targetCat = fileToCat[name];

    if (!targetCat) {
      unknown.push(name);
      skipped++;
      continue;
    }

    const dest = path.join(COMMANDS_DIR, targetCat, name);

    /* Skip if already moved */
    if (fs.existsSync(dest)) {
      console.log(`   ⏭️  Already in ${targetCat}/: ${name}`);
      skipped++;
      continue;
    }

    try {
      fs.moveSync(full, dest, { overwrite: false });
      console.log(`   ✅ ${name.padEnd(25)} → ${targetCat}/`);
      moved++;
    } catch (e) {
      console.log(`   ❌ Failed: ${name} (${e.message})`);
      skipped++;
    }
  }

  /* 4. Summary */
  console.log("\n" + "═".repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Moved:   ${moved}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);

  if (unknown.length) {
    console.log(`\n⚠️  Unknown files (not in any category):`);
    for (const f of unknown) console.log(`   • ${f}`);
    console.log(`\n💡 Edit CATEGORY_MAP in organize.js to add them.`);
  }

  /* 5. Category count */
  console.log("\n📁 Folder contents:\n");
  for (const cat of Object.keys(CATEGORY_MAP)) {
    const dir = path.join(COMMANDS_DIR, cat);
    const files = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => f.endsWith(".js"))
      : [];
    console.log(`   📂 ${cat.padEnd(12)} ${files.length} files`);
  }

  console.log("\n" + "═".repeat(50));
  console.log("\n✅ Done! Run 'npm start' to reload bot.\n");
}

organize();