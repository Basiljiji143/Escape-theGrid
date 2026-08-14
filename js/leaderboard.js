/**
 * leaderboard.js
 * Device-local Top 10 leaderboard. Uses browser Local Storage where
 * available and falls back to an in-memory list (session only) if Local
 * Storage is blocked by the environment. This is explicitly a per-device
 * leaderboard, not a centralized event leaderboard (see GameCraft
 * guidelines section 4.6).
 */

const Leaderboard = (() => {
  const STORAGE_KEY = "escapeTheGrid_leaderboard_v1";
  const MAX_ENTRIES = 10;
  let memoryFallback = [];
  let storageAvailable = null;

  function canUseStorage() {
    if (storageAvailable !== null) return storageAvailable;
    try {
      const testKey = "__escapeTheGrid_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      storageAvailable = true;
    } catch (e) {
      storageAvailable = false;
    }
    return storageAvailable;
  }

  function getAll() {
    if (canUseStorage()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }
    return memoryFallback;
  }

  function saveAll(entries) {
    if (canUseStorage()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        return;
      } catch (e) {
        // fall through to memory
      }
    }
    memoryFallback = entries;
  }

  function submit(name, score) {
    const entries = getAll();
    entries.push({ name, score, date: new Date().toISOString() });
    entries.sort((a, b) => b.score - a.score);
    const trimmed = entries.slice(0, MAX_ENTRIES);
    saveAll(trimmed);
    return trimmed;
  }

  function personalBest(name) {
    const entries = getAll();
    const mine = entries.filter(e => e.name.toLowerCase() === name.toLowerCase());
    if (mine.length === 0) return 0;
    return Math.max(...mine.map(e => e.score));
  }

  function clear() {
    saveAll([]);
    if (canUseStorage()) {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }
  }

  return { submit, getAll, personalBest, clear };
})();
