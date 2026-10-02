// generate-animals.js - Auto-generate animal command files
// Run ONCE: node generate-animals.js

const fs = require("fs-extra");
const path = require("path");

const FUN_DIR = path.join(__dirname, "commands", "fun");
fs.ensureDirSync(FUN_DIR);

/* ================================================================
   ANIMAL LIST — Add more if you want
   ================================================================ */
const ANIMALS = {
  cow:      { emoji: "🐄", prompt: "cute brown cow in green field",              label: "গরু" },
  murgi:    { emoji: "🐔", prompt: "cute fluffy white hen chicken",              label: "মুরগি" },
  dog:      { emoji: "🐕", prompt: "cute golden retriever puppy",                label: "কুকুর" },
  cat:      { emoji: "🐱", prompt: "cute fluffy white persian cat",              label: "বিড়াল" },
  lion:     { emoji: "🦁", prompt: "majestic male lion with mane",               label: "সিংহ" },
  tiger:    { emoji: "🐯", prompt: "royal bengal tiger face",                    label: "বাঘ" },
  elephant: { emoji: "🐘", prompt: "cute baby elephant",                         label: "হাতি" },
  monkey:   { emoji: "🐵", prompt: "cute baby monkey",                           label: "বানর" },
  goat:     { emoji: "🐐", prompt: "cute baby goat",                             label: "ছাগল" },
  duck:     { emoji: "🦆", prompt: "cute white duck",                            label: "হাঁস" },
  pig:      { emoji: "🐷", prompt: "cute pink piglet",                           label: "শূকর" },
  rabbit:   { emoji: "🐰", prompt: "cute fluffy white rabbit",                   label: "খরগোশ" },
  horse:    { emoji: "🐴", prompt: "beautiful white horse",                      label: "ঘোড়া" },
  panda:    { emoji: "🐼", prompt: "cute giant panda",                           label: "পান্ডা" },
  bear:     { emoji: "🐻", prompt: "cute fluffy brown bear",                     label: "ভালুক" },
  fox:      { emoji: "🦊", prompt: "cute red fox",                               label: "শিয়াল" },
  wolf:     { emoji: "🐺", prompt: "majestic grey wolf portrait",                label: "নেকড়ে" },
  frog:     { emoji: "🐸", prompt: "cute green frog",                            label: "ব্যাঙ" },
  penguin:  { emoji: "🐧", prompt: "cute emperor penguin",                       label: "পেঙ্গুইন" },
  owl:      { emoji: "🦉", prompt: "wise owl portrait",                          label: "পেঁচা" },
  parrot:   { emoji: "🦜", prompt: "colorful macaw parrot",                      label: "টিয়া" },
  fish:     { emoji: "🐟", prompt: "beautiful colorful fish",                    label: "মাছ" },
  snake:    { emoji: "🐍", prompt: "elegant green snake",                        label: "সাপ" },
  camel:    { emoji: "🐪", prompt: "cute camel in desert",                       label: "উট" },
  deer:     { emoji: "🦌", prompt: "cute deer in forest",                        label: "হরিণ" }
};

/* ================================================================
   TEMPLATE
   ================================================================ */
function buildFile(name, cfg) {
  return `// commands/fun/${name}.js - NEXUS V1 - ${cfg.label} meme
const { generateAnimalMeme, loadAvatar } = require("../../utils/animalMeme");
const path = require("path");
const os = require("os");
const fs = require("fs-extra");

module.exports = {
  name: "${name}",
  aliases: [],
  version: "1.0.0",
  role: 0,
  description: "Make someone a ${cfg.label} ${cfg.emoji}",
  usage: "/${name} @user  (or reply to a message)",
  execute: async function (api, event, args, db, config) {
    const { threadID, senderID, mentions, messageReply } = event;
    let tmpPath = null;

    try {
      /* ---- Resolve target user ---- */
      let target = String(senderID);
      const ids = Object.keys(mentions || {});
      if (ids.length) target = String(ids[0]);
      else if (messageReply && messageReply.senderID) target = String(messageReply.senderID);

      /* ---- Get name + avatar ---- */
      let name = "User";
      try {
        const info = await api.getUserInfo(target);
        if (info && info[target] && info[target].name) name = info[target].name;
      } catch (_) {}

      const avatar = await loadAvatar(target);

      /* ---- Generate card ---- */
      const buf = await generateAnimalMeme({
        animalPrompt: ${JSON.stringify(cfg.prompt)},
        userName: name,
        userAvatar: avatar,
        emoji: ${JSON.stringify(cfg.emoji)},
        label: ${JSON.stringify(cfg.label)}
      });

      /* ---- Save + Send ---- */
      tmpPath = path.join(os.tmpdir(), \`nexus_${name}_\${Date.now()}.png\`);
      await fs.writeFile(tmpPath, buf);

      api.sendMessage({
        body: \`${cfg.emoji} এই লে \${name} কে ${cfg.label} বানিয়ে দিলাম! 😂\`,
        attachment: fs.createReadStream(tmpPath)
      }, threadID, () => {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
      });

    } catch (e) {
      console.error("[${name}] error:", e.message);
      api.sendMessage("❌ Failed: " + e.message, threadID);
      if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch (_) {} }
    }
  }
};
// Powered by Shihab
`;
}

/* ================================================================
   GENERATE
   ================================================================ */
let created = 0, skipped = 0;

console.log("\n🚀 NEXUS BOT V1 — Animal Command Generator\n");
console.log("═".repeat(50) + "\n");

for (const [name, cfg] of Object.entries(ANIMALS)) {
  const filePath = path.join(FUN_DIR, `${name}.js`);
  if (fs.existsSync(filePath)) {
    console.log(`   ⏭️  ${name}.js already exists`);
    skipped++;
    continue;
  }
  fs.writeFileSync(filePath, buildFile(name, cfg));
  console.log(`   ✅ ${name}.js ${cfg.emoji}  (${cfg.label})`);
  created++;
}

console.log("\n" + "═".repeat(50));
console.log(`\n📊 Summary:`);
console.log(`   ✅ Created: ${created}`);
console.log(`   ⏭️  Skipped: ${skipped}`);
console.log(`\n✅ Done! Run 'npm start' to reload bot.\n`);
console.log(`💡 Usage: /murgi @user  or  /cow @user\n`);