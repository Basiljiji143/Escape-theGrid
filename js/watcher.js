/**
 * watcher.js
 * A patrol enemy that wanders the maze along valid corridors. It does not
 * chase the player directly (keeps it fair/avoidable), but speeds up in the
 * final phase of the timer to raise tension.
 */

const Watcher = (() => {
  const DIRS = [
    { name: "N", dx: 0, dy: -1, opp: "S" },
    { name: "S", dx: 0, dy: 1, opp: "N" },
    { name: "E", dx: 1, dy: 0, opp: "W" },
    { name: "W", dx: -1, dy: 0, opp: "E" },
  ];

  function create(x, y) {
    return { x, y, lastDir: null, stepTimer: 0, stunned: 0 };
  }

  function pickNextStep(watcher, grid) {
    const cell = grid[watcher.y][watcher.x];
    const options = DIRS.filter(d => cell[d.name]);
    if (options.length === 0) return null;

    // Prefer continuing in the same direction (smoother patrol, less jittery),
    // but always allow a random choice so it doesn't get stuck in a loop.
    const continuing = options.find(d => d.name === watcher.lastDir);
    const roll = Math.random();
    let choice;
    if (continuing && roll < 0.6) {
      choice = continuing;
    } else {
      choice = options[Math.floor(Math.random() * options.length)];
    }
    return choice;
  }

  function step(watcher, grid) {
    const choice = pickNextStep(watcher, grid);
    if (!choice) return;
    watcher.x += choice.dx;
    watcher.y += choice.dy;
    watcher.lastDir = choice.name;
  }

  // baseInterval in seconds between steps; speedFactor < 1 makes it faster
  function update(watcher, grid, dt, baseInterval, speedFactor) {
    if (watcher.stunned > 0) {
      watcher.stunned = Math.max(0, watcher.stunned - dt);
    }
    watcher.stepTimer += dt;
    const interval = baseInterval * speedFactor;
    if (watcher.stepTimer >= interval) {
      watcher.stepTimer = 0;
      step(watcher, grid);
    }
  }

  return { create, update };
})();
