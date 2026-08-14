/**
 * game.js
 * Orchestrates screen flow, the render/update loop, input, collisions,
 * and wires the maze/fog/player/watcher/timer/score/leaderboard modules
 * together. See README.md for the full architecture explanation.
 */

(() => {
  // ---------- DOM references ----------
  const screens = {
    welcome: document.getElementById("screen-welcome"),
    instructions: document.getElementById("screen-instructions"),
    game: document.getElementById("screen-game"),
    result: document.getElementById("screen-result"),
    leaderboard: document.getElementById("screen-leaderboard"),
  };

  const welcomeForm = document.getElementById("welcome-form");
  const nameInput = document.getElementById("player-name");
  const nameError = document.getElementById("name-error");
  const btnStart = document.getElementById("btn-start");
  const btnMute = document.getElementById("btn-mute");
  const btnReplay = document.getElementById("btn-replay");
  const btnLeaderboard = document.getElementById("btn-leaderboard");
  const btnBackResult = document.getElementById("btn-back-result");
  const btnClearScores = document.getElementById("btn-clear-scores");

  const hudPlayer = document.getElementById("hud-player");
  const hudTimer = document.getElementById("hud-timer");
  const hudScore = document.getElementById("hud-score");
  const hudKeys = document.getElementById("hud-keys");
  const hudStatus = document.getElementById("hud-status");

  const resultEyebrow = document.getElementById("result-eyebrow");
  const resultHeadline = document.getElementById("result-headline");
  const resultScore = document.getElementById("result-score");
  const resultBest = document.getElementById("result-best");
  const leaderboardList = document.getElementById("leaderboard-list");

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  // ---------- State ----------
  const CELL = 34; // px per maze cell
  let playerName = "";
  let muted = false;
  let level = null;
  let player = null;
  let watcher = null;
  let fog = null;
  let timer = GameTimer.create(60);
  let score = Score.create();
  let keysCollected = 0;
  let checkpointsHit = new Set();
  let gameEnded = false;
  let lastFrameTime = 0;
  let heldDirs = new Set();
  let moveAccumulator = 0;
  let statusClearTimeout = null;

  // ---------- Audio (simple WebAudio beeps, no external assets) ----------
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
  }
  function beep(freq, duration, type = "sine", gainValue = 0.06) {
    if (muted || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
  }
  const sfx = {
    key: () => beep(660, 0.18, "triangle", 0.07),
    checkpoint: () => beep(440, 0.12, "sine", 0.05),
    hit: () => beep(120, 0.25, "sawtooth", 0.08),
    exit: () => beep(880, 0.3, "triangle", 0.08),
    warning: () => beep(300, 0.1, "square", 0.04),
  };

  // ---------- Screen management ----------
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  // ---------- Welcome / name capture ----------
  welcomeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = nameInput.value.trim();
    if (raw.length === 0) {
      nameError.classList.add("visible");
      nameInput.focus();
      return;
    }
    nameError.classList.remove("visible");
    playerName = raw.slice(0, 20);
    showScreen("instructions");
  });

  nameInput.addEventListener("input", () => {
    if (nameInput.value.trim().length > 0) nameError.classList.remove("visible");
  });

  // ---------- Instructions -> Start ----------
  btnStart.addEventListener("click", () => {
    ensureAudio();
    startGame();
  });

  // ---------- Mute ----------
  btnMute.addEventListener("click", () => {
    muted = !muted;
    btnMute.textContent = muted ? "🔇" : "🔊";
    btnMute.setAttribute("aria-pressed", String(muted));
  });

  // ---------- Replay / navigation ----------
  btnReplay.addEventListener("click", () => {
    startGame();
  });

  btnLeaderboard.addEventListener("click", () => {
    renderLeaderboard();
    showScreen("leaderboard");
  });

  btnBackResult.addEventListener("click", () => {
    showScreen("result");
  });

  btnClearScores.addEventListener("click", () => {
    Leaderboard.clear();
    renderLeaderboard();
  });

  // ---------- Game setup ----------
  function startGame() {
    level = Maze.buildLevel({ size: Maze.SIZE, keyCount: 4, checkpointCount: 3 });
    player = Player.create(level.start.x, level.start.y);
    watcher = Watcher.create(
      Math.min(level.size - 1, level.start.x + 3),
      Math.min(level.size - 1, level.start.y + 3)
    );
    fog = Fog.create(level.size, 2.4);
    Fog.update(fog, player.x, player.y);

    score = Score.create();
    keysCollected = 0;
    checkpointsHit = new Set();
    gameEnded = false;
    heldDirs.clear();
    moveAccumulator = 0;

    canvas.width = level.size * CELL;
    canvas.height = level.size * CELL;

    hudPlayer.textContent = playerName;
    hudScore.textContent = "0";
    hudKeys.textContent = `Keys: 0 / ${level.requiredKeys}`;
    hudStatus.textContent = "";
    hudTimer.classList.remove("warning", "urgent");

    showScreen("game");
    canvas.focus();

    GameTimer.start(timer, onTimeUp);
    lastFrameTime = performance.now();
    requestAnimationFrame(loop);
  }

  function setStatus(msg) {
    hudStatus.textContent = msg;
    if (statusClearTimeout) clearTimeout(statusClearTimeout);
    statusClearTimeout = setTimeout(() => { hudStatus.textContent = ""; }, 1400);
  }

  // ---------- Input ----------
  const KEY_MAP = {
    ArrowUp: "N", KeyW: "N",
    ArrowDown: "S", KeyS: "S",
    ArrowLeft: "W", KeyA: "W",
    ArrowRight: "E", KeyD: "E",
  };

  window.addEventListener("keydown", (e) => {
    if (!screens.game.classList.contains("active")) return;
    const dir = KEY_MAP[e.code];
    if (!dir) return;
    e.preventDefault();
    heldDirs.add(dir);
  });

  window.addEventListener("keyup", (e) => {
    const dir = KEY_MAP[e.code];
    if (!dir) return;
    heldDirs.delete(dir);
  });

  function processMovement(dt) {
    if (gameEnded || heldDirs.size === 0) return;
    moveAccumulator += dt;
    if (moveAccumulator < Player.MOVE_DELAY) return;
    moveAccumulator = 0;

    // Take the most recently pressed direction still held (simple: iterate set)
    const dir = [...heldDirs][heldDirs.size - 1];
    const moved = Player.tryMove(player, level.grid, dir);
    if (moved) handleArrival();
  }

  function handleArrival() {
    Fog.update(fog, player.x, player.y);

    // Key pickup
    const keyIndex = level.keys.findIndex(k => k.x === player.x && k.y === player.y);
    if (keyIndex !== -1) {
      level.keys.splice(keyIndex, 1);
      keysCollected += 1;
      Score.add(score, Score.POINTS.KEY);
      hudKeys.textContent = `Keys: ${keysCollected} / ${level.requiredKeys}`;
      setStatus(`+${Score.POINTS.KEY} key found`);
      sfx.key();
    }

    // Checkpoint
    const cpIndex = level.checkpoints.findIndex(
      c => c.x === player.x && c.y === player.y && !checkpointsHit.has(`${c.x},${c.y}`)
    );
    if (cpIndex !== -1) {
      const cp = level.checkpoints[cpIndex];
      checkpointsHit.add(`${cp.x},${cp.y}`);
      Score.add(score, Score.POINTS.CHECKPOINT);
      setStatus(`+${Score.POINTS.CHECKPOINT} checkpoint`);
      sfx.checkpoint();
    }

    // Watcher collision (also checked continuously below, this covers exact overlap on move)
    checkWatcherCollision();

    // Exit
    if (player.x === level.exit.x && player.y === level.exit.y) {
      if (keysCollected >= level.requiredKeys) {
        endGame(true);
      } else {
        setStatus(`Need ${level.requiredKeys - keysCollected} more key(s)`);
      }
    }

    hudScore.textContent = String(score.value);
  }

  function checkWatcherCollision() {
    if (gameEnded || watcher.stunned > 0) return;
    if (watcher.x === player.x && watcher.y === player.y) {
      Score.add(score, Score.POINTS.WATCHER_PENALTY);
      watcher.stunned = 0.9; // brief grace period so it can't repeatedly tick damage
      hudScore.textContent = String(score.value);
      setStatus(`${Score.POINTS.WATCHER_PENALTY} caught by the Watcher`);
      sfx.hit();
    }
  }

  // ---------- Timer / end conditions ----------
  function onTimeUp() {
    endGame(false);
  }

  function endGame(escaped) {
    if (gameEnded) return;
    gameEnded = true;
    GameTimer.stop(timer);

    if (escaped) {
      const timeBonus = Math.round(timer.remaining) * Score.POINTS.TIME_BONUS_PER_SECOND;
      Score.add(score, Score.POINTS.EXIT_BONUS + timeBonus);
      sfx.exit();
    }
    Score.freeze(score);
    hudScore.textContent = String(score.value);

    const best = Leaderboard.personalBest(playerName);
    Leaderboard.submit(playerName, score.value);
    const newBest = Math.max(best, score.value);

    resultEyebrow.textContent = escaped ? "Escaped" : "Time's Up";
    resultHeadline.textContent = escaped
      ? `Well played, ${playerName}.`
      : `So close, ${playerName}.`;
    resultScore.textContent = String(score.value);
    resultBest.textContent = String(newBest);

    showScreen("result");
  }

  function renderLeaderboard() {
    const entries = Leaderboard.getAll();
    leaderboardList.innerHTML = "";
    if (entries.length === 0) {
      leaderboardList.innerHTML = `<li class="leaderboard-empty">No scores yet on this device.</li>`;
      return;
    }
    entries.forEach((e, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span><span class="lb-rank">#${i + 1}</span>${escapeHtml(e.name)}</span><span>${e.score}</span>`;
      leaderboardList.appendChild(li);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Render loop ----------
  function loop(now) {
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    if (!gameEnded) {
      GameTimer.tick(timer, dt);
      updateTimerHud();

      processMovement(dt);

      const secondsLeft = timer.remaining;
      const speedFactor = secondsLeft <= 15 ? 0.6 : 1;
      Watcher.update(watcher, level.grid, dt, 0.42, speedFactor);
      checkWatcherCollision();

      render();

      if (timer.remaining <= 0 && timer.running === false && !gameEnded) {
        // handled by onComplete callback already
      }
    }

    if (!gameEnded) requestAnimationFrame(loop);
  }

  function updateTimerHud() {
    const secs = Math.ceil(timer.remaining);
    hudTimer.textContent = String(secs);
    hudTimer.classList.remove("warning", "urgent");
    if (secs <= 5) {
      hudTimer.classList.add("urgent");
    } else if (secs <= 10) {
      hudTimer.classList.add("warning");
      if (secs === 10) sfx.warning();
    }
  }

  // ---------- Rendering ----------
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#050607";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawMaze();
    drawItems();
    drawWatcher();
    drawPlayer();
  }

  function drawMaze() {
    for (let y = 0; y < level.size; y++) {
      for (let x = 0; x < level.size; x++) {
        const vis = Fog.visibility(fog, x, y, player.x, player.y);
        if (vis <= 0) continue;

        const px = x * CELL, py = y * CELL;
        const floorAlpha = Math.min(0.9, vis);
        ctx.fillStyle = `rgba(232, 163, 61, ${floorAlpha * 0.07})`;
        ctx.fillRect(px, py, CELL, CELL);

        const cell = level.grid[y][x];
        ctx.strokeStyle = `rgba(154, 160, 171, ${Math.min(0.9, vis + 0.1)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (!cell.N) { ctx.moveTo(px, py); ctx.lineTo(px + CELL, py); }
        if (!cell.S) { ctx.moveTo(px, py + CELL); ctx.lineTo(px + CELL, py + CELL); }
        if (!cell.W) { ctx.moveTo(px, py); ctx.lineTo(px, py + CELL); }
        if (!cell.E) { ctx.moveTo(px + CELL, py); ctx.lineTo(px + CELL, py + CELL); }
        ctx.stroke();
      }
    }

    // Exit marker
    const evis = Fog.visibility(fog, level.exit.x, level.exit.y, player.x, player.y);
    if (evis > 0) {
      const px = level.exit.x * CELL, py = level.exit.y * CELL;
      ctx.fillStyle = `rgba(63, 167, 150, ${Math.min(0.9, evis + 0.2)})`;
      ctx.fillRect(px + 6, py + 6, CELL - 12, CELL - 12);
    }
  }

  function drawItems() {
    level.keys.forEach(k => {
      const vis = Fog.visibility(fog, k.x, k.y, player.x, player.y);
      if (vis <= 0) return;
      drawGlyph(k.x, k.y, "#e8a33d", vis, "diamond");
    });
    level.checkpoints.forEach(c => {
      const id = `${c.x},${c.y}`;
      if (checkpointsHit.has(id)) return;
      const vis = Fog.visibility(fog, c.x, c.y, player.x, player.y);
      if (vis <= 0) return;
      drawGlyph(c.x, c.y, "#3fa796", vis, "circle");
    });
  }

  function drawGlyph(x, y, color, vis, shape) {
    const cx = x * CELL + CELL / 2;
    const cy = y * CELL + CELL / 2;
    ctx.fillStyle = color;
    ctx.globalAlpha = Math.min(1, vis + 0.3);
    ctx.beginPath();
    if (shape === "diamond") {
      const r = CELL * 0.2;
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
    } else {
      ctx.arc(cx, cy, CELL * 0.14, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawWatcher() {
    const vis = Fog.litVisibility(fog, watcher.x, watcher.y, player.x, player.y);
    if (vis <= 0) return; // only visible inside torchlight
    const cx = watcher.x * CELL + CELL / 2;
    const cy = watcher.y * CELL + CELL / 2;
    ctx.fillStyle = watcher.stunned > 0 ? "rgba(193,67,43,0.4)" : "#c1432b";
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.22, 0, Math.PI * 2);
    ctx.fill();
    // "eye" glint
    ctx.fillStyle = "#0b0d10";
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlayer() {
    const cx = player.x * CELL + CELL / 2;
    const cy = player.y * CELL + CELL / 2;

    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, CELL * fog.radius);
    grad.addColorStop(0, "rgba(232,163,61,0.18)");
    grad.addColorStop(1, "rgba(232,163,61,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * fog.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f0c579";
    ctx.beginPath();
    ctx.arc(cx, cy, CELL * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0b0d10";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
})();
