/**
 * utils/economy.js
 * NEXUS BOT V1 — Global Economy Helper (race-safe)
 * © 2026
 */

"use strict";

/* ═══ Constants ═══ */
const DAILY_REWARD = 100000;
const WEEKLY_REWARD = 500000;
const MONTHLY_REWARD = 2000000;
const WORK_MIN = 5000;
const WORK_MAX = 25000;
const WORK_COOLDOWN = 60 * 60 * 1000;      /* 1 hour */
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;   /* 24 hours */
const WEEKLY_COOLDOWN = 7 * 24 * 60 * 60 * 1000;
const MONTHLY_COOLDOWN = 30 * 24 * 60 * 60 * 1000;

/* ═══ Format coins ═══ */
function formatCoins(n) {
  n = Number(n) || 0;
  return n.toLocaleString("en-US");
}

/* ═══ Get user (always global) ═══ */
async function getUser(db, userID) {
  const u = await db.getUser(String(userID));
  /* Ensure fields exist */
  if (typeof u.balance !== "number") u.balance = 0;
  if (typeof u.bank !== "number") u.bank = 0;
  return u;
}

/* ═══ Add coins (global) ═══ */
async function addCoins(db, userID, amount, toBank = false) {
  const u = await getUser(db, userID);
  amount = Math.floor(Number(amount)) || 0;
  if (amount <= 0) return u;
  if (toBank) u.bank += amount;
  else u.balance += amount;
  if (typeof u.save === "function") await u.save();
  return u;
}

/* ═══ Remove coins (global) ═══ */
async function removeCoins(db, userID, amount, fromBank = false) {
  const u = await getUser(db, userID);
  amount = Math.floor(Number(amount)) || 0;
  if (amount <= 0) return u;
  if (fromBank) {
    u.bank = Math.max(0, u.bank - amount);
  } else {
    u.balance = Math.max(0, u.balance - amount);
  }
  if (typeof u.save === "function") await u.save();
  return u;
}

/* ═══ Get total balance ═══ */
function totalBalance(u) {
  return (u.balance || 0) + (u.bank || 0);
}

/* ═══ Cooldown check ═══ */
function checkCooldown(lastTime, cooldownMs) {
  if (!lastTime) return { ready: true, remaining: 0 };
  const elapsed = Date.now() - new Date(lastTime).getTime();
  if (elapsed >= cooldownMs) return { ready: true, remaining: 0 };
  return { ready: false, remaining: cooldownMs - elapsed };
}

/* ═══ Format remaining time ═══ */
function formatTime(ms) {
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [];
  if (d) parts.push(d + "d");
  if (h) parts.push(h + "h");
  if (m) parts.push(m + "m");
  parts.push(s + "s");
  return parts.join(" ");
}

/* ═══ Random int ═══ */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ═══ Leaderboard (top N by total) ═══ */
async function leaderboard(db, limit = 10) {
  const users = await db.User.find().limit(1000).lean();
  return users
    .map((u) => ({
      userID: String(u.userID),
      name: u.name || String(u.userID),
      balance: u.balance || 0,
      bank: u.bank || 0,
      total: (u.balance || 0) + (u.bank || 0)
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

module.exports = {
  DAILY_REWARD,
  WEEKLY_REWARD,
  MONTHLY_REWARD,
  WORK_MIN,
  WORK_MAX,
  WORK_COOLDOWN,
  DAILY_COOLDOWN,
  WEEKLY_COOLDOWN,
  MONTHLY_COOLDOWN,
  formatCoins,
  getUser,
  addCoins,
  removeCoins,
  totalBalance,
  checkCooldown,
  formatTime,
  randInt,
  leaderboard
};

// © 2026 NEXUS BOT V1