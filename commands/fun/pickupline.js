const LINES = [
  "Are you a magician? Because whenever I look at you, everyone else disappears.",
  "Do you have a map? I just got lost in your eyes.",
  "Are you WiFi? Because I'm feeling a connection.",
  "If you were a vegetable, you'd be a cute-cumber.",
  "Are you a parking ticket? Because you've got FINE written all over you.",
  "Is your name Google? Because you have everything I've been searching for.",
  "Are you the sun? Because you light up my world.",
  "Do you believe in love at first sight, or should I walk by again?",
  "If beauty were time, you'd be an eternity.",
  "Are you made of copper and tellurium? Because you're Cu-Te."
];
module.exports = {
  name: "pickupline", aliases: ["pickup", "flirt2"], version: "1.0.0", role: 0,
  description: "Get a random pick-up line", usage: "/pickupline",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    api.sendMessage("💘 " + LINES[Math.floor(Math.random() * LINES.length)], threadID);
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app