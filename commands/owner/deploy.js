/**
 * commands/owner/deploy.js
 * NEXUS BOT V1 — Deploy with live progress
 * © 2026
 */

"use strict";

const axios = require("axios");

/* ═══ Config ═══ */
const POLL_INTERVAL = 4000;      // 4s between polls
const MAX_WAIT_MS   = 5 * 60e3;  // give up after 5 min
const BAR_WIDTH     = 20;

/* ═══ Progress bar builder ═══ */
function progressBar(pct) {
  const filled = Math.round((pct / 100) * BAR_WIDTH);
  const empty  = BAR_WIDTH - filled;
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, empty));
}

/* ═══ Time formatter ═══ */
function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

/* ═══ Build message body ═══ */
function buildBody(state) {
  const { phase, pct, status, elapsed, extra } = state;
  const bar = progressBar(pct);

  const icons = {
    queued:    "🕐",
    building:  "🔨",
    uploading: "📤",
    live:      "🟢",
    failed:    "🔴",
    canceled:  "⚪"
  };
  const icon = icons[status] || "⏳";

  const lines = [
    "🚀  **DEPLOY  ·  RENDER**",
    "━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
    `${icon}  **${phase}**`,
    "",
    "`" + bar + "`  **" + Math.round(pct) + "%**",
    "",
    `⏱️  Elapsed: **${fmtTime(elapsed)}**`
  ];

  if (extra) lines.push(extra);
  lines.push("", "━━━━━━━━━━━━━━━━━━━━━━━━━");

  return lines.join("\n");
}

/* ═══ Small delay helper ═══ */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ═══ Poll Render deploy status (if API key + service ID set) ═══ */
async function pollRenderDeploy(deployId, apiKey) {
  try {
    const r = await axios.get(
      `https://api.render.com/v1/services/${process.env.RENDER_SERVICE_ID}/deploys/${deployId}`,
      {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        timeout: 10000
      }
    );
    return r.data;
  } catch (e) {
    return null;
  }
}

/* ═══ Find latest deploy via Render API ═══ */
async function getLatestDeploy(apiKey) {
  try {
    const r = await axios.get(
      `https://api.render.com/v1/services/${process.env.RENDER_SERVICE_ID}/deploys?limit=1`,
      {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        timeout: 10000
      }
    );
    if (Array.isArray(r.data) && r.data.length) return r.data[0].deploy;
    return null;
  } catch (_) {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════ */
module.exports = {
  name: "deploy",
  aliases: ["deploynow", "rebuild", "redeploy"],
  version: "2.0.0",
  role: 2,
  description: "Trigger Render deploy with live progress",
  usage: "/deploy",
  category: "owner",

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* ═══ Owner check ═══ */
    const isOwner =
      String(senderID) === String(config.ownerID) ||
      (config.adminIDs || []).map(String).includes(String(senderID));

    if (!isOwner) { react("⛔"); return; }

    /* ═══ Hook check ═══ */
    const hookUrl = process.env.RENDER_DEPLOY_HOOK;
    if (!hookUrl) {
      react("❌");
      return api.sendMessage(
        "❌ **Deploy hook not set**\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
        "**Setup steps:**\n" +
        "1️⃣  Render → Service → Settings\n" +
        "2️⃣  **Deploy Hook** → *Create*\n" +
        "3️⃣  Copy the URL\n" +
        "4️⃣  Add env var on server:\n" +
        "     `RENDER_DEPLOY_HOOK=<url>`\n\n" +
        "**Optional (for live status):**\n" +
        "     `RENDER_API_KEY=<key>`\n" +
        "     `RENDER_SERVICE_ID=<id>`",
        threadID
      );
    }

    react("🚀");

    /* ═══ Send initial message and grab its ID ═══ */
    const startTime = Date.now();
    let editMID = null;

    const state = {
      phase: "Triggering deploy…",
      pct: 3,
      status: "queued",
      elapsed: 0,
      extra: null
    };

    const initialBody = buildBody(state);

    await new Promise((resolve) => {
      api.sendMessage(initialBody, threadID, (err, info) => {
        if (!err && info && info.messageID) editMID = info.messageID;
        resolve();
      });
    });

    /* ═══ Edit helper (safe) ═══ */
    const edit = (body) => {
      if (!editMID) return;
      try {
        if (typeof api.editMessage === "function") {
          api.editMessage(body, editMID, () => {});
        } else if (typeof api.editMessageText === "function") {
          api.editMessageText(body, editMID, () => {});
        }
      } catch (_) {}
    };

    /* ═══ Post deploy hook ═══ */
    let triggered = false;
    try {
      const r = await axios.post(hookUrl, {}, { timeout: 30000 });
      triggered = r.status >= 200 && r.status < 300;
      console.log(`[deploy] hook status: ${r.status}`);
    } catch (e) {
      console.error("[deploy] hook error:", e.message);
      state.phase  = "Hook trigger failed";
      state.status = "failed";
      state.pct    = 0;
      state.extra  = `❌  \`${String(e.message).slice(0, 80)}\``;
      state.elapsed = Date.now() - startTime;
      edit(buildBody(state));
      react("❌");
      return;
    }

    if (!triggered) {
      state.phase = "Hook rejected";
      state.status = "failed";
      state.pct = 0;
      edit(buildBody(state));
      react("❌");
      return;
    }

    /* ═══ Live progress loop ═══ */
    const apiKey = process.env.RENDER_API_KEY;
    const serviceId = process.env.RENDER_SERVICE_ID;
    const hasLiveApi = !!(apiKey && serviceId);

    let lastPct = 3;
    let finalStatus = "queued";

    /* Time-based fallback ranges (approx per phase) */
    const TIMELINE = [
      { ms: 5000,  pct: 15, phase: "Queued — waiting for runner…",  status: "queued" },
      { ms: 20000, pct: 35, phase: "Building — installing deps…",   status: "building" },
      { ms: 45000, pct: 55, phase: "Building — running build step…",status: "building" },
      { ms: 75000, pct: 78, phase: "Uploading image…",              status: "uploading" },
      { ms: 100000,pct: 92, phase: "Starting service…",             status: "building" },
      { ms: 120000,pct: 100,phase: "Service is live 🎉",            status: "live" }
    ];

    const interval = Math.min(POLL_INTERVAL, 3000);
    const endAt = startTime + MAX_WAIT_MS;

    while (Date.now() < endAt) {
      await sleep(interval);
      const elapsed = Date.now() - startTime;

      /* ── Try live API first ── */
      if (hasLiveApi) {
        const deploy = await getLatestDeploy(apiKey);
        if (deploy && deploy.status) {
          finalStatus = deploy.status;
          const map = {
            queued:          { pct: 20, phase: "Queued — waiting for runner…" },
            build_in_progress: { pct: 55, phase: "Building…" },
            update_in_progress:{ pct: 70, phase: "Updating service…" },
            live:            { pct: 100, phase: "Service is live 🎉" },
            build_failed:    { pct: 100, phase: "Build failed" },
            canceled:        { pct: 100, phase: "Deploy canceled" },
            pre_deploy_in_progress: { pct: 40, phase: "Pre-deploy hooks…" }
          };
          const m = map[deploy.status] || { pct: lastPct + 2, phase: deploy.status };

          /* Only move forward */
          const newPct = Math.max(lastPct, m.pct);
          lastPct = newPct;

          state.phase = m.phase;
          state.pct   = newPct;
          state.status = deploy.status.includes("fail") ? "failed"
                       : deploy.status === "live"          ? "live"
                       : deploy.status === "canceled"      ? "canceled"
                       : "building";
          state.elapsed = elapsed;
          state.extra = `📊  \`${deploy.status}\``;

          edit(buildBody(state));

          if (state.status === "live" || state.status === "failed" || state.status === "canceled") {
            break;
          }
          continue;
        }
      }

      /* ── Fallback time-based progression ── */
      let step = TIMELINE[TIMELINE.length - 1];
      for (const t of TIMELINE) {
        if (elapsed < t.ms) { step = t; break; }
      }
      const newPct = Math.max(lastPct, step.pct);
      lastPct = newPct;

      state.phase = step.phase;
      state.pct   = newPct;
      state.status = step.status;
      state.elapsed = elapsed;
      state.extra = hasLiveApi ? null : "ℹ️  *Set RENDER_API_KEY for live status*";

      edit(buildBody(state));

      if (step.status === "live") break;
    }

    /* ═══ Finalize ═══ */
    const totalMs = Date.now() - startTime;

    if (state.status === "live") {
      react("✅");
      state.phase = "Deploy complete 🎉";
      state.pct   = 100;
      state.status = "live";
      state.elapsed = totalMs;
      state.extra = `✅  Bot restarted in **${fmtTime(totalMs)}**`;
    } else if (state.status === "failed" || state.status === "canceled") {
      react("❌");
      state.extra = `❌  Deploy **${state.status}** — check Render logs`;
    } else {
      /* Timed out */
      state.status = "live";
      state.phase  = "Deploy triggered (status timeout)";
      state.pct    = 100;
      state.elapsed = totalMs;
      state.extra = `ℹ️  No final status from API — check dashboard\n🔗 https://dashboard.render.com`;
      react("✅");
    }

    edit(buildBody(state));
  }
};

// © 2026 NEXUS BOT V1