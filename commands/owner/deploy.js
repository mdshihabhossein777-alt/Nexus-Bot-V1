// @ts-nocheck
/**
 * commands/owner/deploy.js
 * NEXUS BOT V1 — Deploy with live progress
 * © 2026
 */

"use strict";

const axios = require("axios");

/* ═══ Config ═══ */
const POLL_INTERVAL = 4000;
const MAX_WAIT_MS   = 5 * 60e3;
const BAR_WIDTH     = 20;

/* ═══ Progress bar ═══ */
function progressBar(pct) {
  const filled = Math.round((pct / 100) * BAR_WIDTH);
  const empty  = BAR_WIDTH - filled;
  return "#".repeat(Math.max(0, filled)) + "-".repeat(Math.max(0, empty));
}

/* ═══ Time formatter ═══ */
function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

/* ═══ Build body ═══ */
function buildBody(state) {
  const { phase, pct, status, elapsed, extra } = state;
  const bar = progressBar(pct);

  const icons = {
    queued:    "[ ]",
    building:  "[>]",
    uploading: "[^]",
    live:      "[OK]",
    failed:    "[X]",
    canceled:  "[-]"
  };
  const icon = icons[status] || "[.]";

  const lines = [
    "DEPLOY  -  RENDER",
    "=======================",
    "",
    `${icon}  ${phase}`,
    "",
    "[" + bar + "]  " + Math.round(pct) + "%",
    "",
    `Elapsed: ${fmtTime(elapsed)}`
  ];

  if (extra) lines.push(extra);
  lines.push("", "=======================");

  return lines.join("\n");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ═══ Get latest deploy via Render API ═══ */
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
  } catch (_) { return null; }
}

/* ═══ Owner check ═══ */
function isOwnerCheck(senderID, config) {
  const ownerID =
    config.ownerID || config.ownerId || config.owner ||
    (global.NEXUS && global.NEXUS.config &&
      (global.NEXUS.config.ownerID || global.NEXUS.config.ownerId || global.NEXUS.config.owner));

  const adminList = [
    ...(config.adminIDs  || []),
    ...(config.adminBot  || []),
    ...(config.admins    || []),
    ...((global.NEXUS && global.NEXUS.config &&
        (global.NEXUS.config.adminBot || global.NEXUS.config.adminIDs || [])) || [])
  ].map(String);

  const sid = String(senderID);
  if (ownerID && sid === String(ownerID)) return true;
  if (adminList.includes(sid)) return true;
  return false;
}

/* ═══ Trigger hook (POST → GET fallback) ═══ */
async function triggerDeploy(hookUrl) {
  try {
    const r = await axios.post(hookUrl, null, { timeout: 30000 });
    if (r.status >= 200 && r.status < 300) return { ok: true, via: "POST", status: r.status };
  } catch (e) {
    console.log("[deploy] POST fail:", String(e.message).slice(0, 80));
  }
  try {
    const r = await axios.get(hookUrl, { timeout: 30000 });
    if (r.status >= 200 && r.status < 300) return { ok: true, via: "GET", status: r.status };
  } catch (e) {
    console.log("[deploy] GET fail:", String(e.message).slice(0, 80));
  }
  return { ok: false, via: null, status: 0 };
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMMAND
   ═══════════════════════════════════════════════════════════ */
module.exports = {
  name: "deploy",
  aliases: ["deploynow", "rebuild", "redeploy"],
  version: "2.2.0",
  role: 2,
  description: "Trigger Render deploy with live progress",
  usage: "/deploy",
  category: "owner",

  checkTrigger: function (body) {
    if (!body) return false;
    const t = body.trim().toLowerCase();
    return (
      t === "deploy" || t === "deploynow" ||
      t === "rebuild" || t === "redeploy" ||
      t.startsWith("deploy ") || t.startsWith("deploynow ") ||
      t.startsWith("rebuild ") || t.startsWith("redeploy ")
    );
  },

  execute: async function (api, event, args, db, config) {
    const { threadID, messageID, senderID } = event;

    console.log(`[deploy] sender=${senderID}`);
    console.log(`[deploy] owner=${config.ownerID || config.ownerId || config.owner}`);
    console.log(`[deploy] hook=${!!process.env.RENDER_DEPLOY_HOOK}`);
    console.log(`[deploy] editMessage=${typeof api.editMessage}`);

    const react = (e) => {
      if (messageID) try { api.setMessageReaction(e, messageID, threadID, () => {}); } catch (_) {}
    };

    /* Owner check */
    if (!isOwnerCheck(senderID, config)) {
      console.log("[deploy] not owner");
      react("\u26D4");
      return api.sendMessage("[X] Owner-only command.", threadID);
    }

    /* Hook check */
    const hookUrl = process.env.RENDER_DEPLOY_HOOK;
    if (!hookUrl) {
      react("\u274C");
      return api.sendMessage(
        "[X] Deploy hook not set\n" +
        "------------------------\n\n" +
        "Setup:\n" +
        "1. Render -> Service -> Settings\n" +
        "2. Deploy Hook -> Create\n" +
        "3. Copy URL\n" +
        "4. Add env: RENDER_DEPLOY_HOOK=<url>\n\n" +
        "Optional (live status):\n" +
        "   RENDER_API_KEY=<key>\n" +
        "   RENDER_SERVICE_ID=<id>",
        threadID
      );
    }

    react("\uD83D\uDE80");

    const startTime = Date.now();
    let editMID = null;

    const state = {
      phase: "Triggering deploy...",
      pct: 3, status: "queued", elapsed: 0, extra: null
    };

    await new Promise((resolve) => {
      api.sendMessage(buildBody(state), threadID, (err, info) => {
        if (!err && info && info.messageID) editMID = info.messageID;
        resolve();
      });
    });

    /* Edit helper */
    let editWarned = false;
    const edit = (body) => {
      if (!editMID) return;
      try {
        if (typeof api.editMessage === "function") {
          api.editMessage(body, editMID, () => {});
        } else if (typeof api.editMessageText === "function") {
          api.editMessageText(body, editMID, () => {});
        } else if (!editWarned) {
          console.log("[deploy] no editMessage method - live update off");
          editWarned = true;
        }
      } catch (e) {
        console.log("[deploy] edit err:", e.message);
      }
    };

    /* Trigger */
    const trigger = await triggerDeploy(hookUrl);
    console.log(`[deploy] trigger: ${trigger.ok ? "OK via " + trigger.via : "FAIL"}`);

    if (!trigger.ok) {
      state.phase = "Hook trigger failed";
      state.status = "failed";
      state.pct = 0;
      state.extra = "[X] Check hook URL & env vars";
      state.elapsed = Date.now() - startTime;
      edit(buildBody(state));
      react("\u274C");
      return;
    }

    /* Progress loop */
    const apiKey = process.env.RENDER_API_KEY;
    const serviceId = process.env.RENDER_SERVICE_ID;
    const hasLiveApi = !!(apiKey && serviceId);

    let lastPct = 3;

    const TIMELINE = [
      { ms: 5000,   pct: 15,  phase: "Queued - waiting for runner...",    status: "queued" },
      { ms: 20000,  pct: 35,  phase: "Building - installing deps...",     status: "building" },
      { ms: 45000,  pct: 55,  phase: "Building - running build step...",  status: "building" },
      { ms: 75000,  pct: 78,  phase: "Uploading image...",                status: "uploading" },
      { ms: 100000, pct: 92,  phase: "Starting service...",               status: "building" },
      { ms: 120000, pct: 100, phase: "Service is live!",                  status: "live" }
    ];

    const interval = Math.min(POLL_INTERVAL, 3000);
    const endAt = startTime + MAX_WAIT_MS;

    while (Date.now() < endAt) {
      await sleep(interval);
      const elapsed = Date.now() - startTime;

      if (hasLiveApi) {
        const deploy = await getLatestDeploy(apiKey);
        if (deploy && deploy.status) {
          const map = {
            queued:                 { pct: 20,  phase: "Queued..." },
            build_in_progress:      { pct: 55,  phase: "Building..." },
            update_in_progress:     { pct: 70,  phase: "Updating..." },
            pre_deploy_in_progress: { pct: 40,  phase: "Pre-deploy hooks..." },
            live:                   { pct: 100, phase: "Service is live!" },
            build_failed:           { pct: 100, phase: "Build failed" },
            canceled:               { pct: 100, phase: "Deploy canceled" }
          };
          const m = map[deploy.status] || { pct: lastPct + 2, phase: deploy.status };

          lastPct = Math.max(lastPct, m.pct);
          state.phase   = m.phase;
          state.pct     = lastPct;
          state.status  = deploy.status.includes("fail") ? "failed"
                        : deploy.status === "live"         ? "live"
                        : deploy.status === "canceled"     ? "canceled"
                        : "building";
          state.elapsed = elapsed;
          state.extra   = "Status: " + deploy.status;
          edit(buildBody(state));

          if (state.status === "live" || state.status === "failed" || state.status === "canceled") break;
          continue;
        }
      }

      let step = TIMELINE[TIMELINE.length - 1];
      for (const t of TIMELINE) { if (elapsed < t.ms) { step = t; break; } }

      lastPct = Math.max(lastPct, step.pct);
      state.phase   = step.phase;
      state.pct     = lastPct;
      state.status  = step.status;
      state.elapsed = elapsed;
      state.extra   = hasLiveApi ? null : "Tip: set RENDER_API_KEY for live status";
      edit(buildBody(state));

      if (step.status === "live") break;
    }

    /* Finalize */
    const totalMs = Date.now() - startTime;

    if (state.status === "live") {
      react("\u2705");
      state.phase   = "Deploy complete!";
      state.pct     = 100;
      state.elapsed = totalMs;
      state.extra   = "Bot restarted in " + fmtTime(totalMs);
    } else if (state.status === "failed" || state.status === "canceled") {
      react("\u274C");
      state.extra = "Deploy " + state.status + " - check Render logs";
    } else {
      state.status  = "live";
      state.phase   = "Deploy triggered (status timeout)";
      state.pct     = 100;
      state.elapsed = totalMs;
      state.extra   = "Check dashboard: https://dashboard.render.com";
      react("\u2705");
    }

    edit(buildBody(state));

    if (!editMID) {
      api.sendMessage(buildBody(state), threadID);
    }
  }
};

// © 2026 NEXUS BOT V1