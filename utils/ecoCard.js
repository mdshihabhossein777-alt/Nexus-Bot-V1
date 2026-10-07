/**
 * utils/ecoCard.js
 * NEXUS BOT V1 — Mastercard-style economy card
 * © 2026
 */

"use strict";

const { createCanvas, loadImage } = require("@napi-rs/canvas");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

const BANK_NAME = "NEXUS LTD";

/* ═══ Fetch FB avatar ═══ */
async function getAvatar(uid) {
  const urls = [
    `https://graph.facebook.com/${uid}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
    `https://graph.facebook.com/${uid}/picture?type=large&width=720&height=720`
  ];
  for (const url of urls) {
    try {
      const r = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 12000,
        maxRedirects: 5,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      const b = Buffer.from(r.data);
      if (b.length > 1000) return b;
    } catch (_) { continue; }
  }
  return null;
}

/* ═══ Round rect ═══ */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ═══ Format card number from UID ═══ */
function formatCardNumber(uid) {
  const s = String(uid).padEnd(16, "0").slice(0, 16);
  return `${s.slice(0, 4)}  ${s.slice(4, 8)}  ${s.slice(8, 12)}  ${s.slice(12, 16)}`;
}

/* ═══ Mastercard logo (2 overlapping circles) ═══ */
function drawMastercardLogo(ctx, x, y, size) {
  /* Red circle */
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = "#EB001B";
  ctx.fill();

  /* Yellow circle */
  ctx.beginPath();
  ctx.arc(x + size * 0.85, y, size, 0, Math.PI * 2);
  ctx.fillStyle = "#F79E1B";
  ctx.fill();

  /* Overlap (orange) */
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(x + size * 0.85, y, size, 0, Math.PI * 2);
  ctx.fillStyle = "#FF5F00";
  ctx.fill();
  ctx.restore();

  /* "mastercard" text */
  ctx.font = `bold ${Math.floor(size * 0.55)}px sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText("mastercard", x - size * 0.15, y + size * 2.1);
}

/* ═══ Chip (gold squares) ═══ */
function drawChip(ctx, x, y, w, h) {
  /* Chip background */
  roundRect(ctx, x, y, w, h, 6);
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "#E8C25D");
  grad.addColorStop(0.5, "#F0D774");
  grad.addColorStop(1, "#D4A83E");
  ctx.fillStyle = grad;
  ctx.fill();

  /* Chip border */
  ctx.strokeStyle = "#B8923A";
  ctx.lineWidth = 1;
  ctx.stroke();

  /* Chip lines */
  ctx.strokeStyle = "rgba(184, 146, 58, 0.6)";
  ctx.lineWidth = 1;
  const rows = 4;
  const cols = 3;
  for (let i = 1; i < rows; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 4, y + (h / rows) * i);
    ctx.lineTo(x + w - 4, y + (h / rows) * i);
    ctx.stroke();
  }
  for (let j = 1; j < cols; j++) {
    ctx.beginPath();
    ctx.moveTo(x + (w / cols) * j, y + 4);
    ctx.lineTo(x + (w / cols) * j, y + h - 4);
    ctx.stroke();
  }
}

/* ═══════════════════════════════════════════════════════════
   MAIN CARD GENERATOR
   ═══════════════════════════════════════════════════════════ */
async function generateEcoCard(opts) {
  const {
    userName = "USER",
    userID = "0000000000",
    balance = 0,
    bank = 0,
    type = "wallet",       /* "wallet" | "bank" */
    avatarBuf = null
  } = opts;

  const W = 900;
  const H = 500;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  /* ═══ Background gradient ═══ */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  if (type === "bank") {
    bg.addColorStop(0, "#0a1929");
    bg.addColorStop(0.5, "#1a3a5c");
    bg.addColorStop(1, "#0d2137");
  } else {
    bg.addColorStop(0, "#0f0c29");
    bg.addColorStop(0.5, "#302b63");
    bg.addColorStop(1, "#24243e");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* ═══ Radial glows ═══ */
  const glow1 = ctx.createRadialGradient(W * 0.8, H * 0.2, 0, W * 0.8, H * 0.2, 400);
  glow1.addColorStop(0, type === "bank" ? "rgba(0, 200, 255, 0.3)" : "rgba(255, 20, 147, 0.25)");
  glow1.addColorStop(1, "transparent");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(W * 0.2, H * 0.8, 0, W * 0.2, H * 0.8, 400);
  glow2.addColorStop(0, type === "bank" ? "rgba(255, 215, 0, 0.2)" : "rgba(138, 43, 226, 0.25)");
  glow2.addColorStop(1, "transparent");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  /* ═══ Decorative lines ═══ */
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, H * 0.15 + i * 90);
    ctx.lineTo(W, H * 0.15 + i * 90 - 50);
    ctx.stroke();
  }

  /* ═══ Card border ═══ */
  ctx.strokeStyle = type === "bank" ? "rgba(0, 200, 255, 0.6)" : "rgba(255, 215, 0, 0.5)";
  ctx.lineWidth = 3;
  roundRect(ctx, 20, 20, W - 40, H - 40, 24);
  ctx.stroke();

  /* ═══ BANK NAME (top-left) ═══ */
  ctx.textAlign = "left";
  ctx.font = "bold 32px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = type === "bank" ? "#00c8ff" : "#FFD700";
  ctx.shadowBlur = 15;
  ctx.fillText(BANK_NAME, 60, 90);
  ctx.shadowBlur = 0;

  /* Subtitle */
  ctx.font = "italic 14px 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillText(type === "bank" ? "PREMIUM BANKING" : "WORLD CARD", 60, 115);

  /* ═══ Card Type (top-right) ═══ */
  ctx.textAlign = "right";
  ctx.font = "bold 20px 'Segoe UI', sans-serif";
  ctx.fillStyle = type === "bank" ? "#00c8ff" : "#FFD700";
  ctx.fillText(type === "bank" ? "💎 PLATINUM" : "💳 PREMIUM", W - 60, 85);

  /* ═══ CHIP (left-middle) ═══ */
  drawChip(ctx, 60, 165, 80, 60);

  /* ═══ CONTACTLESS icon ═══ */
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 3;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(170, 195, i * 8, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  }

  /* ═══ AVATAR (top-right of chip area) ═══ */
  if (avatarBuf) {
    try {
      const img = await loadImage(avatarBuf);
      const cx = W - 150;
      const cy = 195;
      const r = 55;

      /* Ring */
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = type === "bank" ? "#00c8ff" : "#FFD700";
      ctx.lineWidth = 3;
      ctx.stroke();

      /* Clip + draw */
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
    } catch (_) {}
  }

  /* ═══ CARD NUMBER (middle) ═══ */
  ctx.textAlign = "left";
  ctx.font = "bold 34px 'Courier New', monospace";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 8;
  ctx.fillText(formatCardNumber(userID), 60, 290);
  ctx.shadowBlur = 0;

  /* ═══ BALANCE LABEL + VALUE (bottom-left) ═══ */
  ctx.font = "bold 14px 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillText(type === "bank" ? "BANK BALANCE" : "WALLET BALANCE", 60, 350);

  /* Value */
  const coinValue = type === "bank" ? bank : balance;
  ctx.font = "bold 56px 'Segoe UI', sans-serif";
  ctx.fillStyle = type === "bank" ? "#00c8ff" : "#FFD700";
  ctx.shadowColor = type === "bank" ? "#00c8ff" : "#FFD700";
  ctx.shadowBlur = 20;
  ctx.fillText(`${Number(coinValue).toLocaleString()}`, 60, 410);
  ctx.shadowBlur = 0;

  /* Currency */
  ctx.font = "bold 24px 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.fillText("$COINS", 60 + ctx.measureText(`${Number(coinValue).toLocaleString()}`).width + 300, 410);

  /* ═══ HOLDER NAME (bottom) ═══ */
  ctx.font = "bold 20px 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  const holderName = String(userName).toUpperCase().slice(0, 24);
  ctx.fillText(holderName, 60, 460);

  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fillText("CARD HOLDER", 60, 440);

  /* ═══ MASTERCARD LOGO (bottom-right) ═══ */
  drawMastercardLogo(ctx, W - 200, 420, 35);

  /* ═══ Total line (bank type) ═══ */
  if (type === "bank") {
    ctx.font = "14px 'Segoe UI', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.textAlign = "center";
    ctx.fillText(`💰 Total: ${Number(balance + bank).toLocaleString()} $COINS`, W / 2, H - 30);
  }

  return canvas.toBuffer("image/png");
}

module.exports = {
  generateEcoCard,
  getAvatar,
  BANK_NAME
};

// © 2026 NEXUS BOT V1