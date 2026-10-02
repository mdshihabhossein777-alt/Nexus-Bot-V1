const fs = require("fs-extra");
const path = require("path");

module.exports = {
  name: "editcmd",
  aliases: ["viewcmd"],
  version: "1.0.0",
  role: 2,
  description: "Custom command er code dekho",
  usage: "/editcmd <name>",
  execute: async function (api, event, args) {
    const { threadID } = event;
    try {
      const name = (args[0] || "").toLowerCase();
      if (!name) return api.sendMessage(`📝 /editcmd <name>`, threadID);

      const filePath = path.join(__dirname, "..", "custom", `${name}.js`);
      if (!fs.existsSync(filePath)) return api.sendMessage(`❌ "${name}" nei.`, threadID);

      const code = fs.readFileSync(filePath, "utf8");
      const preview = code.slice(0, 3000) + (code.length > 3000 ? "\n...(truncated)" : "");

      api.sendMessage(`📄 ${name}.js\n\`\`\`javascript\n${preview}\n\`\`\``, threadID);
    } catch (e) {
      api.sendMessage("❌ " + e.message, threadID);
    }
  }
};