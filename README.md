# Escape the Grid

**Participant:** _Basil Jiji_
**Team:** Prompters

## Brief Description
A top-down maze escape game where visibility is limited to a torchlight radius around the player. Explore the fogged maze, collect keys, avoid a patrolling Watcher, and reach the exit before the 60-second timer runs out.

## Objective and Rules
- Collect the required number of keys to unlock the exit.
- Reach the exit before time runs out to escape successfully.
- Avoid the Watcher — contact costs points and briefly stuns you.
- Checkpoints are optional bonus points, not required to escape.

## How to Play
1. Enter your name on the welcome screen.
2. Read the instructions screen.
3. Press Start to begin the 60-second timer.
4. Navigate the maze using the controls below, collect keys, and reach the glowing exit tile.

## Controls
- Arrow keys or WASD to move.
- On mobile or touch-capable devices, swipe the maze to move one tile or use the floating D-pad.
- Mute button (top-right of HUD) toggles sound.

## Scoring Rules
| Action | Points |
|---|---|
| Key collected | +50 |
| Checkpoint reached | +20 |
| Successful exit | +100 flat |
| Time remaining bonus | +5 per second left (on successful exit only) |
| Watcher collision | -15 |

Score is deterministic, updates live, and freezes immediately when time expires or the player exits.

## Technologies Used
HTML5, CSS3, vanilla JavaScript, Canvas API, Web Audio API (simple procedural beep SFX, no external audio files), browser Local Storage (with in-memory fallback) for the local leaderboard.

## AI Tool Used
**AI Tool Used:** Microsoft Copilot
**Purpose:** Brainstorming the fog-of-war maze concept, scaffolding the maze-generation and fog-visibility algorithms, and drafting UI copy/styling.
**Participant Validation:** All generated code was reviewed, tested, modified and validated by the participant. No confidential, client, or personal information was entered into the AI tool.

## Launch Instructions
No build step required.
1. Unzip the project.
2. Open `index.html` directly in a modern browser (Chrome or Edge recommended), **or** serve the folder with a simple local server (e.g. `npx serve` or the VS Code "Live Server" extension) if your browser restricts local file access for JS modules.
3. Play.

## Browsers Tested
- Verified end-to-end (name capture → instructions → gameplay → Watcher collision → timer expiry → result → leaderboard) in a Chromium-based browser during development.
- _[Before final submission, confirm manually in Microsoft Edge and Google Chrome per GameCraft section 5.4 and check off here.]_

## Known Limitations
- Leaderboard is device-local only (Local Storage), not a centralized event leaderboard, per GameCraft guidelines section 4.6.
- Movement is grid-snapped rather than smoothly interpolated, by design, to keep collision/scoring simple and deterministic.
- Watcher patrol is non-chasing (wanders corridors) rather than pathfinding toward the player, to keep the hazard fair and avoidable.
- Internet dependency: Google Fonts (Cinzel/Inter/JetBrains Mono) are loaded from a CDN for typography. If offline, the browser falls back to the specified system/serif/monospace fonts and the game remains fully playable — no gameplay logic depends on network access.
- Mobile movement uses one-tile swipe gestures and a floating D-pad; touch controls have not been tested on every device/browser combination.

## Libraries and Asset Credits
- Fonts: Cinzel, Inter, JetBrains Mono — via Google Fonts (open license).
- No external image or audio assets used; all sound is generated procedurally via the Web Audio API.
- No third-party JS libraries used (vanilla JS only).

## Project Structure
```
escape-the-grid/
  index.html
  css/styles.css
  js/maze.js        - maze generation + solvability check + item placement
  js/fog.js          - fog-of-war visibility calculation
  js/player.js       - player movement + wall collision
  js/watcher.js      - patrol enemy logic
  js/timer.js        - 60-second countdown
  js/score.js        - scoring rules
  js/leaderboard.js  - local Top 10 leaderboard
  js/game.js         - screen flow, render loop, input, wiring
  assets/            - (reserved, currently empty — no external assets used)
  README.md
```
