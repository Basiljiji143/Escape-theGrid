/**
 * fog.js
 * Tracks which cells are currently visible / previously seen, and renders
 * the torchlight mask over the maze canvas.
 */

const Fog = (() => {
  function create(size, radius = 2.4) {
    const seen = Array.from({ length: size }, () => new Array(size).fill(false));
    return { size, radius, seen };
  }

  function update(fog, playerX, playerY) {
    for (let y = 0; y < fog.size; y++) {
      for (let x = 0; x < fog.size; x++) {
        const d = Math.hypot(x - playerX, y - playerY);
        if (d <= fog.radius) fog.seen[y][x] = true;
      }
    }
  }

  function visibility(fog, x, y, playerX, playerY) {
    const d = Math.hypot(x - playerX, y - playerY);
    if (d <= fog.radius) {
      // brighter near the player, softly falling off toward the radius edge
      return Math.max(0, 1 - d / fog.radius * 0.55);
    }
    if (fog.seen[y] && fog.seen[y][x]) return 0.16; // dim memory of explored tiles
    return 0;
  }

  // Like visibility(), but ignores remembered/explored tiles — only true for
  // tiles currently inside the live torchlight radius. Used for anything that
  // should hide the instant it leaves the torch (e.g. the Watcher).
  function litVisibility(fog, x, y, playerX, playerY) {
    const d = Math.hypot(x - playerX, y - playerY);
    if (d <= fog.radius) return Math.max(0, 1 - d / fog.radius * 0.55);
    return 0;
  }

  return { create, update, visibility, litVisibility };
})();
