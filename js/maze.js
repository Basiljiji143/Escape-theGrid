/**
 * maze.js
 * Randomized recursive-backtracker maze generation, solvability check (BFS),
 * and placement of start/exit/keys/checkpoints.
 */

const Maze = (() => {
  const SIZE = 15; // 15x15 cells

  // Each cell tracks which walls are open: {N, S, E, W}
  function createGrid(size) {
    const grid = [];
    for (let y = 0; y < size; y++) {
      const row = [];
      for (let x = 0; x < size; x++) {
        row.push({ x, y, N: false, S: false, E: false, W: false, visited: false });
      }
      grid.push(row);
    }
    return grid;
  }

  const DIRS = [
    { name: "N", dx: 0, dy: -1, opp: "S" },
    { name: "S", dx: 0, dy: 1, opp: "N" },
    { name: "E", dx: 1, dy: 0, opp: "W" },
    { name: "W", dx: -1, dy: 0, opp: "E" },
  ];

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generate(size = SIZE) {
    const grid = createGrid(size);
    const stack = [];
    const start = grid[0][0];
    start.visited = true;
    stack.push(start);

    while (stack.length) {
      const current = stack[stack.length - 1];
      const dirs = shuffle([...DIRS]);
      let advanced = false;

      for (const d of dirs) {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const next = grid[ny][nx];
        if (next.visited) continue;

        current[d.name] = true;
        next[d.opp] = true;
        next.visited = true;
        stack.push(next);
        advanced = true;
        break;
      }

      if (!advanced) stack.pop();
    }

    return grid;
  }

  // BFS from start to exit, returns path length or -1 if unreachable
  function shortestPath(grid, size, startX, startY, endX, endY) {
    const visited = Array.from({ length: size }, () => new Array(size).fill(false));
    const queue = [{ x: startX, y: startY, dist: 0 }];
    visited[startY][startX] = true;

    while (queue.length) {
      const { x, y, dist } = queue.shift();
      if (x === endX && y === endY) return dist;
      const cell = grid[y][x];
      for (const d of DIRS) {
        if (!cell[d.name]) continue;
        const nx = x + d.dx;
        const ny = y + d.dy;
        if (visited[ny][nx]) continue;
        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny, dist: dist + 1 });
      }
    }
    return -1;
  }

  // Returns all cells reachable from start with their distances (for placing items away from start)
  function distancesFrom(grid, size, startX, startY) {
    const dist = Array.from({ length: size }, () => new Array(size).fill(-1));
    dist[startY][startX] = 0;
    const queue = [{ x: startX, y: startY }];
    while (queue.length) {
      const { x, y } = queue.shift();
      const cell = grid[y][x];
      for (const d of DIRS) {
        if (!cell[d.name]) continue;
        const nx = x + d.dx;
        const ny = y + d.dy;
        if (dist[ny][nx] !== -1) continue;
        dist[ny][nx] = dist[y][x] + 1;
        queue.push({ x: nx, y: ny });
      }
    }
    return dist;
  }

  function buildLevel(options = {}) {
    const size = options.size || SIZE;
    const keyCount = options.keyCount || 4;
    const checkpointCount = options.checkpointCount || 2;

    let grid, dist, exitDist;
    const startX = 0, startY = 0;
    const endX = size - 1, endY = size - 1;

    // Regenerate until solvable (recursive backtracker always produces a fully
    // connected maze, so this is a safety net rather than a real retry loop).
    do {
      grid = generate(size);
      exitDist = shortestPath(grid, size, startX, startY, endX, endY);
    } while (exitDist === -1);

    dist = distancesFrom(grid, size, startX, startY);

    // Candidate cells for items: prefer cells reasonably far from start,
    // excluding the exit cell itself.
    const candidates = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (x === startX && y === startY) continue;
        if (x === endX && y === endY) continue;
        candidates.push({ x, y, d: dist[y][x] });
      }
    }
    candidates.sort((a, b) => b.d - a.d); // farthest first
    shuffle(candidates.slice(0, Math.max(candidates.length, 1))); // light shuffle of order

    const used = new Set();
    function takeSpread(count, pool) {
      const picked = [];
      for (const c of pool) {
        if (picked.length >= count) break;
        const key = `${c.x},${c.y}`;
        if (used.has(key)) continue;
        used.add(key);
        picked.push({ x: c.x, y: c.y });
      }
      return picked;
    }

    // Keys drawn from the farther half of the maze so they require real exploration.
    const farHalf = candidates.slice(0, Math.ceil(candidates.length / 2));
    const keys = takeSpread(keyCount, shuffle(farHalf));

    // Checkpoints from remaining candidates.
    const remaining = candidates.filter(c => !used.has(`${c.x},${c.y}`));
    const checkpoints = takeSpread(checkpointCount, shuffle(remaining));

    return {
      grid,
      size,
      start: { x: startX, y: startY },
      exit: { x: endX, y: endY },
      keys,
      checkpoints,
      requiredKeys: keyCount,
    };
  }

  return { generate, shortestPath, distancesFrom, buildLevel, SIZE };
})();
