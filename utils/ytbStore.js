/**
 * utils/ytbStore.js
 * NEXUS BOT V1 — YouTube search reply store
 * © 2026
 */

const store = new Map();

/* Auto-cleanup after 5 min */
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store) {
    if (now - (val.time || 0) > 5 * 60 * 1000) {
      store.delete(key);
    }
  }
}, 60 * 1000);

module.exports = store;