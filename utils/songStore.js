// utils/songStore.js - NEXUS V1 - Song search memory
const searches = new Map();

/* Auto-cleanup 5 min */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of searches) {
    if (now - v.time > 5 * 60 * 1000) {
      searches.delete(k);
    }
  }
}, 60 * 1000);

module.exports = searches;