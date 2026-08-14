/**
 * timer.js
 * Exact 60-second countdown. Starts only on explicit start(), stops
 * automatically at zero, and exposes the elapsed/remaining time for the
 * render loop rather than driving gameplay itself.
 */

const GameTimer = (() => {
  function create(durationSeconds = 60) {
    return {
      duration: durationSeconds,
      remaining: durationSeconds,
      running: false,
      onComplete: null,
    };
  }

  function start(timer, onComplete) {
    timer.remaining = timer.duration;
    timer.running = true;
    timer.onComplete = onComplete || null;
  }

  function stop(timer) {
    timer.running = false;
  }

  function tick(timer, dt) {
    if (!timer.running) return;
    timer.remaining = Math.max(0, timer.remaining - dt);
    if (timer.remaining <= 0) {
      timer.remaining = 0;
      timer.running = false;
      if (timer.onComplete) timer.onComplete();
    }
  }

  function reset(timer) {
    timer.remaining = timer.duration;
    timer.running = false;
  }

  return { create, start, stop, tick, reset };
})();
