/**
 * score.js
 * Deterministic, explainable scoring. All point values live here so the
 * README's "scoring rules" section stays accurate to the code.
 */

const Score = (() => {
  const POINTS = {
    KEY: 50,
    CHECKPOINT: 20,
    EXIT_BONUS: 100,
    TIME_BONUS_PER_SECOND: 5,
    WATCHER_PENALTY: -15,
  };

  function create() {
    return { value: 0, frozen: false };
  }

  function add(score, amount) {
    if (score.frozen) return score.value;
    score.value = Math.max(0, score.value + amount);
    return score.value;
  }

  function freeze(score) {
    score.frozen = true;
  }

  return { create, add, freeze, POINTS };
})();
