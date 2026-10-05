// utils/songStore.js
const store = new Map();

// Auto cleanup every 10 min
setInterval(() => {
  const now = Date.now();
  const FIVE_MIN = 5 * 60 * 1000;
  for (const [key, value] of store.entries()) {
    if (value && value.time && (now - value.time) > FIVE_MIN) {
      store.delete(key);
    }
  }
}, 10 * 60 * 1000);

module.exports = store;