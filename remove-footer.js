// remove-footer.js - Auto remove footer from all command files
// Usage: node remove-footer.js

const fs = require("fs-extra");
const path = require("path");

const COMMANDS_DIR = path.join(__dirname, "commands");

const FOOTER_PATTERNS = [
  /\n*✨ Powered by Shihab ✨\n*/g,
  /\n*⚡ Powered by Shihab\n*/g,
  /\n*Powered by Shihab\n*/g,
  /\n*© NEXUS BOT V1 \|.*?\n*/g,
  /\n*╭─+╮\n\s+✨ Powered by Shihab ✨\n╰─+╯\n*/g
];

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      walkDir(full, callback);
    } else if (f.endsWith(".js")) {
      callback(full);
    }
  }
}

let modified = 0;
let scanned = 0;

walkDir(COMMANDS_DIR, (filePath) => {
  scanned++;
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;

  for (const pattern of FOOTER_PATTERNS) {
    content = content.replace(pattern, "");
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    modified++;
    console.log(`✅ ${path.relative(COMMANDS_DIR, filePath)}`);
  }
});

console.log(`\n📊 Scanned: ${scanned} | Modified: ${modified}`);
console.log("✅ Done! Run 'npm start' to reload.");