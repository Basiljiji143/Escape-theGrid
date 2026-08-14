/**
 * player.js
 * Grid-based player movement with wall collision, driven by the maze's
 * per-cell wall data (N/S/E/W open flags).
 */

const Player = (() => {
  function create(x, y) {
    return { x, y, moveCooldown: 0 };
  }

  const MOVE_DELAY = 0.11; // seconds between grid steps while a key is held

  function tryMove(player, grid, dir) {
    const cell = grid[player.y][player.x];
    let dx = 0, dy = 0, wallOpen = false;

    if (dir === "N" && cell.N) { dy = -1; wallOpen = true; }
    if (dir === "S" && cell.S) { dy = 1; wallOpen = true; }
    if (dir === "E" && cell.E) { dx = 1; wallOpen = true; }
    if (dir === "W" && cell.W) { dx = -1; wallOpen = true; }

    if (!wallOpen) return false;

    player.x += dx;
    player.y += dy;
    return true;
  }

  return { create, tryMove, MOVE_DELAY };
})();
