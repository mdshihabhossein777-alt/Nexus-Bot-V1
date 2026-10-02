const axios = require("axios");
module.exports = {
  name: "trivia", aliases: ["quizme2"], version: "1.0.0", role: 0,
  description: "Get a random trivia question", usage: "/trivia",
  execute: async function (api, event, args, db) {
    const { threadID } = event;
    try {
      const r = await axios.get("https://opentdb.com/api.php", { params: { amount: 1, type: "multiple" }, timeout: 10000 });
      const q = r.data?.results?.[0];
      if (!q) throw new Error("No trivia available.");
      const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
      const answers = [...q.incorrect_answers, q.correct_answer].sort();
      api.sendMessage(
        `❓ TRIVIA (${q.category} — ${q.difficulty})\n\n${decode(q.question)}\n\n` +
        answers.map((a, i) => `${i + 1}. ${decode(a)}`).join("\n") +
        `\n\n💡 Answer: ${decode(q.correct_answer)}`,
        threadID
      );
    } catch (e) {
      const fallback = [
        { q: "What is 5 + 7?", a: "12" },
        { q: "How many days in a leap year?", a: "366" },
        { q: "What color is the sky?", a: "blue" }
      ];
      const f = fallback[Math.floor(Math.random() * fallback.length)];
      api.sendMessage(`❓ ${f.q}\n\n💡 Answer: ${f.a}`, threadID);
    }
  }
};
// © NEXUS BOT V1 | nexus-bot-v1.vercel.app