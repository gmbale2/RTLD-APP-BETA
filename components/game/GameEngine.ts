export type Phase = "start" | "playing" | "dead" | "levelup" | "gameover" | "win";

export interface PlayerState {
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  dirX: number;
  dirY: number;
  moving: boolean;
}

export interface PunkState {
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  dirX: number;
  dirY: number;
  color: string;
  spawnX: number;
  spawnY: number;
  progress: number;
  respawnTimer: number;
  flashing: boolean;   // true when scared but power about to expire
  lastDirX: number;    // direction we arrived from (for no-reversal)
  lastDirY: number;
  goingHome: boolean;  // eaten — rushing back to spawn at 2× speed
}

export interface FruitState {
  pixelX: number;
  pixelY: number;
  label: string;
  score: number;
  timer: number;
}

export interface GameState {
  maze: number[][];
  player: PlayerState;
  punks: PunkState[];
  phase: Phase;
  brainsCollected: number;
  totalBrains: number;
  lives: number;
  powered: boolean;
  powerTimer: number;
  tileSize: number;
  level: number;
  inScatter: boolean;
  score: number;
  levelTimerTicks: number;
  lastLevelTimeBonus: number;
  lastLevelTimeBonusRank: string;
  fruit: FruitState | null;
}

// ─── Maze ────────────────────────────────────────────────────────────────────

const MAZE_COLS = 20;
const MAZE_ROWS = 20;

// Classic Pac-Man inspired layout — left/right symmetric, corridors, central ghost-house block
// Legend: 1=wall  0=brain(dot)  2=can(power pellet)  -1=empty walkable
//         Cols 0 & 19 = border walls; rows 0 & 19 = border walls
const INITIAL_MAZE: number[][] = [
  //  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 0
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 1  full corridor
  [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1], // 2
  [1, 2, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 2, 1], // 3  ← power cans
  [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1], // 4  wide corridor
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1], // 5
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], // 6  inner corridor
  [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1], // 7  above ghost house
  [1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1], // 8  ← ghost house top
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1], // 9  ← ghost house middle
  [1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1], // 10 ← ghost house bottom
  [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1], // 11 below ghost house
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], // 12
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1], // 13
  [1, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 1], // 14 ← power cans
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1], // 15
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], // 16
  [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1], // 17
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 18 full bottom corridor
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 19
];

// ─── Speed (tiles per tick at 30 fps) ────────────────────────────────────────
// Arcade-accurate Pac-Man percentages of max speed (0.20 tiles/tick at 30 fps):
//   L1:   player 80% / powered 90% / ghost 75% / scared 50%
//   L2–4: player 90% / powered 95% / ghost 85% / scared 55%
//   L5+:  player 100% / powered 100% / ghost 95% / scared 60%
// [playerNormal, playerPowered, ghostNormal, ghostScared]
const SPEED_TABLE: [number, number, number, number][] = [
  [0.16, 0.18, 0.15, 0.10],  // Level 1
  [0.18, 0.19, 0.17, 0.11],  // Levels 2–4
  [0.20, 0.20, 0.19, 0.12],  // Levels 5+
];

// Cornering tolerance: how far through the current tile the player can be before
// a queued perpendicular turn is applied early (Pac-Man "cornering" mechanic).
const CORNER_THRESHOLD = 0.5;

function getSpeedTier(level: number): [number, number, number, number] {
  if (level <= 1) return SPEED_TABLE[0];
  if (level <= 4) return SPEED_TABLE[1];
  return SPEED_TABLE[2];
}

// ─── Power duration (ticks at 30 fps) ────────────────────────────────────────
// Level 1=6s, 2=5s, 3-4=4s, 5=3s, 6=2s, 7+=2s (never zero for playability)
const POWER_DURATION_TABLE = [180, 150, 120, 120, 90, 60, 60, 60];
function getPowerDuration(level: number): number {
  const idx = Math.min(level - 1, POWER_DURATION_TABLE.length - 1);
  return POWER_DURATION_TABLE[idx];
}

const POWER_FLASH_THRESHOLD = 60; // Start flashing 2 s before power expires

// ─── Scatter / Chase phases ───────────────────────────────────────────────────
// Alternating: scatter, chase, scatter, chase ... (ticks at 30 fps)
// Matches original Pac-Man level-1 timing; later levels shorten scatter phases
const SCATTER_CHASE_L1  = [210, 600, 210, 600, 150, 600, 150, 999999];
const SCATTER_CHASE_REST = [210, 600, 210, 600, 150, 999999, 1, 999999];

function getScatterChaseTable(level: number): number[] {
  return level === 1 ? SCATTER_CHASE_L1 : SCATTER_CHASE_REST;
}

// ─── Bonus fruit ─────────────────────────────────────────────────────────────
// Spawns twice per level when brainsCollected reaches each threshold.
// Fruit floats at a fixed map position for FRUIT_DURATION ticks (~9 s).
const FRUIT_SPAWN_THRESHOLDS = [70, 170];
const FRUIT_SCORE_TABLE  = [100, 300, 500, 700, 1000, 2000, 3000, 5000];

// Pac-Man arcade groupings: L1=100, L2=300, L3-4=500, L5-6=700,
// L7-8=1000, L9-10=2000, L11-12=3000, L13+=5000
function getFruitIndex(level: number): number {
  if (level === 1)  return 0;
  if (level === 2)  return 1;
  if (level <= 4)   return 2;
  if (level <= 6)   return 3;
  if (level <= 8)   return 4;
  if (level <= 10)  return 5;
  if (level <= 12)  return 6;
  return 7;
}
const FRUIT_LABEL_TABLE  = ["💀", "🧠", "🪦", "🧪", "🦷", "☣️", "📼", "🗝️"];
const FRUIT_DURATION     = 270;  // 9 seconds at 30 fps
const FRUIT_GRID_X       = 9;   // below ghost house, centre of the maze
const FRUIT_GRID_Y       = 11;
const FRUIT_HIT_RADIUS   = 0.9; // in tiles

// ─── Ghost homes (scatter corner targets) ────────────────────────────────────
const SCATTER_CORNERS = [
  { x: 18, y: 0 },  // punk 0 → top-right
  { x: 1,  y: 18 }, // punk 1 → bottom-left
  { x: 18, y: 18 }, // punk 2 → bottom-right
];

// ─── Punk spawn positions ─────────────────────────────────────────────────────
const PUNK_COLORS = ["#00d4ff", "#ff6600", "#00ff88"];
const PUNK_SPAWN_POSITIONS = [
  { x: 18, y: 1 },
  { x: 1,  y: 18 },
  { x: 18, y: 18 },
];

const PUNK_RESPAWN_TICKS    = 152;
const CAN_RESPAWN_NORMAL_TICKS = 450;
const CAN_RESPAWN_DEATH_TICKS  = 240;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cloneMaze(m: number[][]): number[][] {
  return m.map((row) => [...row]);
}

function isWalkable(maze: number[][], x: number, y: number): boolean {
  return x >= 0 && x < MAZE_COLS && y >= 0 && y < MAZE_ROWS && maze[y][x] !== 1;
}

function makePunks(tileSize: number): PunkState[] {
  return PUNK_SPAWN_POSITIONS.map((sp, i) => ({
    gridX: sp.x,
    gridY: sp.y,
    pixelX: sp.x * tileSize + tileSize / 2,
    pixelY: sp.y * tileSize + tileSize / 2,
    dirX: 0,
    dirY: 0,
    color: PUNK_COLORS[i],
    spawnX: sp.x,
    spawnY: sp.y,
    progress: 0,
    respawnTimer: 0,
    flashing: false,
    lastDirX: 0,
    lastDirY: 0,
    goingHome: false,
  }));
}

interface CanRespawn {
  x: number;
  y: number;
  timer: number;
}

// ─── Engine class ─────────────────────────────────────────────────────────────

export class GameEngine {
  private maze: number[][];
  private tileSize: number;
  private canRespawns: CanRespawn[] = [];

  // Player — starts at bottom-centre like classic Pac-Man
  private pGridX = 9;
  private pGridY = 18;
  private pDirX = 0;
  private pDirY = 0;
  private pPendingDirX = 0;
  private pPendingDirY = 0;
  private pProgress = 0;
  private pMoving = false;

  // State
  private phase: Phase = "start";
  private lives = 3;
  private brainsCollected = 0;
  private totalBrains = 0;
  private powered = false;
  private powerTimer = 0;
  private level = 1;

  // Scoring
  private score = 0;
  private levelTimerTicks = 0;
  private levelTimerStarted = false;
  private punksEatenInPower = 0;
  private lastLevelTimeBonus = 0;
  private lastLevelTimeBonusRank = "";

  // Bonus fruit
  private fruit: FruitState | null = null;
  private fruitSpawnedFlags = [false, false]; // one flag per FRUIT_SPAWN_THRESHOLDS slot

  // Scatter / Chase
  private scatterPhaseIdx = 0;     // index into scatter-chase sequence
  private scatterPhaseTimer = 0;   // ticks remaining in current phase
  private inScatter = true;         // true = scatter, false = chase
  private sigReverse = false;       // signal ghosts to reverse on next tile

  private punks: PunkState[];

  constructor(canvasSize: number) {
    this.tileSize = Math.floor(canvasSize / MAZE_COLS);
    this.maze = cloneMaze(INITIAL_MAZE);
    this.punks = makePunks(this.tileSize);
    this.resetScatterChase();

    for (let r = 0; r < MAZE_ROWS; r++) {
      for (let c = 0; c < MAZE_COLS; c++) {
        if (this.maze[r][c] === 0) this.totalBrains++;
      }
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /** Direction pressed — buffer a pending turn */
  setDirection(dx: number, dy: number) {
    if (this.phase === "start") this.phase = "playing";
    if (this.phase !== "playing") return;

    if (!this.levelTimerStarted) this.levelTimerStarted = true;

    this.pPendingDirX = dx;
    this.pPendingDirY = dy;

    // If player is stationary, try to start moving immediately
    if (!this.pMoving) {
      const nx = this.pGridX + dx;
      const ny = this.pGridY + dy;
      if (isWalkable(this.maze, nx, ny)) {
        this.pDirX = dx;
        this.pDirY = dy;
        this.pMoving = true;
      }
    }
  }

  /** Direction released — intentionally a no-op.
   *  The pending direction stays buffered until it is successfully applied
   *  (the player takes the turn) or overridden by a new keypress, matching
   *  the original Pac-Man input model.  Clearing on release caused missed
   *  corners when players tapped quickly.
   */
  clearDirection() { /* no-op */ }

  startGame() {
    if (this.phase === "start") this.phase = "playing";
  }

  // ── Level up ───────────────────────────────────────────────────────────────

  levelUp() {
    if (this.phase !== "levelup") return;
    this.level++;
    this.maze = cloneMaze(INITIAL_MAZE);
    this.brainsCollected = 0;
    this.totalBrains = 0;
    for (let r = 0; r < MAZE_ROWS; r++) {
      for (let c = 0; c < MAZE_COLS; c++) {
        if (this.maze[r][c] === 0) this.totalBrains++;
      }
    }
    this.canRespawns = [];
    this.powered = false;
    this.powerTimer = 0;
    this.pGridX = 9;
    this.pGridY = 18;
    this.pDirX = 0;
    this.pDirY = 0;
    this.pProgress = 0;
    this.pPendingDirX = 0;
    this.pPendingDirY = 0;
    this.pMoving = false;
    this.punks = makePunks(this.tileSize);
    this.resetScatterChase();
    // Reset level timer and punk multiplier; score carries over
    this.levelTimerTicks = 0;
    this.levelTimerStarted = false;
    this.punksEatenInPower = 0;
    this.lastLevelTimeBonus = 0;
    this.lastLevelTimeBonusRank = "";
    // Reset fruit
    this.fruit = null;
    this.fruitSpawnedFlags = [false, false];
    // Stay in "start" so the maze is visible before the player moves
    this.phase = "start";
  }

  // ── Respawn after death ────────────────────────────────────────────────────

  triggerRespawn() {
    if (this.phase !== "dead") return;
    this.pGridX = 9;
    this.pGridY = 18;
    this.pDirX = 0;
    this.pDirY = 0;
    this.pProgress = 0;
    this.pPendingDirX = 0;
    this.pPendingDirY = 0;
    this.pMoving = false;
    this.powered = false;
    this.powerTimer = 0;
    this.punks = makePunks(this.tileSize);
    this.canRespawns = this.canRespawns.map((c) => ({
      ...c,
      timer: Math.min(c.timer, CAN_RESPAWN_DEATH_TICKS),
    }));
    this.fruit = null; // clear active fruit on respawn
    this.resetScatterChase();
    this.phase = "playing";
  }

  // ── Pixel helpers ──────────────────────────────────────────────────────────

  private playerPixelX(): number {
    return (this.pGridX + this.pDirX * this.pProgress) * this.tileSize + this.tileSize / 2;
  }

  private playerPixelY(): number {
    return (this.pGridY + this.pDirY * this.pProgress) * this.tileSize + this.tileSize / 2;
  }

  // ── Main tick ──────────────────────────────────────────────────────────────

  tick() {
    // Level timer counts through deaths (dying costs time)
    if (this.levelTimerStarted && (this.phase === "playing" || this.phase === "dead")) {
      this.levelTimerTicks++;
    }

    if (this.phase !== "playing") return;

    // Power-up countdown
    if (this.powered) {
      this.powerTimer--;
      // Flash warning in last 2 seconds
      const flashing = this.powerTimer > 0 && this.powerTimer <= POWER_FLASH_THRESHOLD;
      this.punks.forEach((p) => { if (!p.goingHome && p.respawnTimer === 0) p.flashing = flashing; });

      if (this.powerTimer <= 0) {
        this.powered = false;
        this.powerTimer = 0;
        this.punks.forEach((p) => { p.flashing = false; });
        this.punksEatenInPower = 0;
      }
    }

    // Scatter / Chase phase timer
    this.tickScatterChase();

    this.tickCanRespawns();
    this.tickFruit();
    this.tickPlayer();
    if (this.phase !== "playing") return;
    this.tickPunks();
    this.checkCollisions();
  }

  // ── Scatter / Chase ────────────────────────────────────────────────────────

  private resetScatterChase() {
    this.scatterPhaseIdx = 0;
    const table = getScatterChaseTable(this.level);
    this.scatterPhaseTimer = table[0];
    this.inScatter = true; // always start in scatter
    this.sigReverse = false;
  }

  private tickScatterChase() {
    if (this.powered) return; // power-up pauses scatter/chase cycle

    this.scatterPhaseTimer--;
    if (this.scatterPhaseTimer <= 0) {
      const table = getScatterChaseTable(this.level);
      this.scatterPhaseIdx = Math.min(this.scatterPhaseIdx + 1, table.length - 1);
      this.scatterPhaseTimer = table[this.scatterPhaseIdx];
      this.inScatter = this.scatterPhaseIdx % 2 === 0;
      // Signal all living ghosts to reverse on their next tile
      this.sigReverse = true;
    }
  }

  // ── Player movement ────────────────────────────────────────────────────────

  private tickPlayer() {
    if (!this.pMoving) return;

    const [pNormal, pPowered] = getSpeedTier(this.level);
    const speed = this.powered ? pPowered : pNormal;

    const hasPending = this.pPendingDirX !== 0 || this.pPendingDirY !== 0;

    // ── INSTANT REVERSAL ───────────────────────────────────────────────────
    if (
      hasPending &&
      this.pPendingDirX === -this.pDirX &&
      this.pPendingDirY === -this.pDirY
    ) {
      this.pGridX += this.pDirX;
      this.pGridY += this.pDirY;
      this.pProgress = 1.0 - this.pProgress;
      this.pDirX = this.pPendingDirX;
      this.pDirY = this.pPendingDirY;
      this.pPendingDirX = 0;
      this.pPendingDirY = 0;
    }

    this.pProgress += speed;

    // ── TWO-PHASE CORNERING (matches reference Pac-Man) ────────────────────
    //
    // Phase A — CURRENT tile centre (first half of tile, progress < 0.5):
    //   If a perpendicular direction is queued and valid from the CURRENT tile,
    //   snap back to the current tile centre (progress = 0) and turn.
    //   This handles the case where the player presses a turn direction while
    //   they have barely left the previous intersection.
    //
    // Phase B — NEXT tile centre (second half of tile, progress ≥ 0.5):
    //   If a perpendicular direction is queued and valid from the NEXT tile,
    //   snap forward to that tile and turn early — the classic "cornering"
    //   that prevents having to be pixel-perfect.
    //
    // Together these two phases mean a queued turn fires the instant it becomes
    // geometrically possible, regardless of whether the player pressed early or
    // late within the tile.

    const pndX = this.pPendingDirX;
    const pndY = this.pPendingDirY;
    const isPerpendicular =
      (pndX !== 0 || pndY !== 0) &&
      !(pndX === this.pDirX && pndY === this.pDirY);

    if (isPerpendicular) {
      if (this.pProgress < CORNER_THRESHOLD) {
        // Phase A: can we turn at the CURRENT tile?
        // No handleTileArrival here — the current tile was already processed
        // when Tarman arrived; this is purely a direction correction + snap.
        const nx = this.pGridX + pndX;
        const ny = this.pGridY + pndY;
        if (isWalkable(this.maze, nx, ny)) {
          this.pProgress = 0; // snap to current tile centre
          this.pDirX = pndX;
          this.pDirY = pndY;
          this.pPendingDirX = 0;
          this.pPendingDirY = 0;
          // Fall through — progress already advanced this tick, no extra return
        }
      } else {
        // Phase B: can we turn at the NEXT tile?
        const nextX = this.pGridX + this.pDirX;
        const nextY = this.pGridY + this.pDirY;
        if (isWalkable(this.maze, nextX, nextY)) {
          const turnX = nextX + pndX;
          const turnY = nextY + pndY;
          if (isWalkable(this.maze, turnX, turnY)) {
            this.pGridX = nextX;
            this.pGridY = nextY;
            this.pProgress = 0;
            this.pDirX = pndX;
            this.pDirY = pndY;
            this.pPendingDirX = 0;
            this.pPendingDirY = 0;
            this.handleTileArrival();
            if (this.phase !== "playing") return;
            return; // movement continues next tick from the new tile
          }
        }
      }
    }

    // ── NORMAL TILE ARRIVAL ────────────────────────────────────────────────
    if (this.pProgress >= 1.0) {
      this.pGridX += this.pDirX;
      this.pGridY += this.pDirY;
      this.pProgress -= 1.0;

      this.handleTileArrival();
      if (this.phase !== "playing") return;

      // Apply buffered turn if the new direction is walkable
      if (this.pPendingDirX !== 0 || this.pPendingDirY !== 0) {
        const nx = this.pGridX + this.pPendingDirX;
        const ny = this.pGridY + this.pPendingDirY;
        if (isWalkable(this.maze, nx, ny)) {
          this.pDirX = this.pPendingDirX;
          this.pDirY = this.pPendingDirY;
          this.pPendingDirX = 0;
          this.pPendingDirY = 0;
        }
      }

      // Keep moving if path is clear; otherwise stop and wait for new input
      const fwdX = this.pGridX + this.pDirX;
      const fwdY = this.pGridY + this.pDirY;
      if (!isWalkable(this.maze, fwdX, fwdY)) {
        this.pMoving = false;
        this.pProgress = 0;
      }
    }
  }

  private computeTimeBonus(): { bonus: number; rank: string } {
    const secs = Math.floor(this.levelTimerTicks / 30);
    if (secs <= 30)  return { bonus: 5000, rank: "⚡ LIGHTNING" };
    if (secs <= 60)  return { bonus: 3000, rank: "🏃 SPEEDY" };
    if (secs <= 90)  return { bonus: 1500, rank: "🎯 SHARP" };
    if (secs <= 120) return { bonus: 750,  rank: "⚖️ STEADY" };
    return { bonus: 250, rank: "🐌 SLUGGISH" };
  }

  private handleTileArrival() {
    const cell = this.maze[this.pGridY][this.pGridX];
    if (cell === 0) {
      this.maze[this.pGridY][this.pGridX] = -1;
      this.brainsCollected++;
      this.score += 10;
      // Spawn bonus fruit at predefined thresholds
      for (let fi = 0; fi < FRUIT_SPAWN_THRESHOLDS.length; fi++) {
        if (!this.fruitSpawnedFlags[fi] && this.brainsCollected >= FRUIT_SPAWN_THRESHOLDS[fi]) {
          this.fruitSpawnedFlags[fi] = true;
          this.spawnFruit();
          break; // only one fruit at a time
        }
      }
      if (this.brainsCollected >= this.totalBrains) {
        const { bonus, rank } = this.computeTimeBonus();
        this.score += bonus;
        this.lastLevelTimeBonus = bonus;
        this.lastLevelTimeBonusRank = rank;
        this.phase = "levelup";
      }
    } else if (cell === 2) {
      this.canRespawns.push({ x: this.pGridX, y: this.pGridY, timer: CAN_RESPAWN_NORMAL_TICKS });
      this.maze[this.pGridY][this.pGridX] = -1;
      this.powered = true;
      this.powerTimer = getPowerDuration(this.level);
      this.punksEatenInPower = 0;
      this.score += 50;
      // All punks immediately reverse direction — matches original Pac-Man behaviour
      this.sigReverse = true;
    }
  }

  private tickCanRespawns() {
    for (let i = this.canRespawns.length - 1; i >= 0; i--) {
      this.canRespawns[i].timer--;
      if (this.canRespawns[i].timer <= 0) {
        const { x, y } = this.canRespawns[i];
        this.maze[y][x] = 2;
        this.canRespawns.splice(i, 1);
      }
    }
  }

  // ── Punk movement ──────────────────────────────────────────────────────────

  private tickPunks() {
    const [, , ghostNormal, ghostScared] = getSpeedTier(this.level);

    for (let i = 0; i < this.punks.length; i++) {
      const punk = this.punks[i];

      // ── "Going home" — eaten punk rushing back to spawn ──────────────────
      if (punk.goingHome) {
        const homeSpeed = ghostNormal * 2.0; // 2× normal speed while going home
        punk.progress += homeSpeed;

        if (punk.progress >= 1.0) {
          punk.gridX += punk.dirX;
          punk.gridY += punk.dirY;
          punk.progress -= 1.0;
          punk.lastDirX = punk.dirX;
          punk.lastDirY = punk.dirY;
          punk.dirX = 0;
          punk.dirY = 0;

          if (punk.gridX === punk.spawnX && punk.gridY === punk.spawnY) {
            // Arrived — short pause then reappear in normal mode
            punk.goingHome = false;
            punk.respawnTimer = 30; // 1 second pause at spawn
          } else {
            // Steer directly toward spawn using Manhattan greedy
            const DIRS = [{ dx: 0, dy: -1 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 0 }];
            let bestDx = 0, bestDy = 0, bestDist = Infinity;
            for (const { dx, dy } of DIRS) {
              if (dx === -punk.lastDirX && dy === -punk.lastDirY) continue;
              const nx = punk.gridX + dx, ny = punk.gridY + dy;
              if (!isWalkable(this.maze, nx, ny)) continue;
              const d = Math.hypot(nx - punk.spawnX, ny - punk.spawnY);
              if (d < bestDist) { bestDist = d; bestDx = dx; bestDy = dy; }
            }
            // Allow reversal as fallback if no other move found
            if (bestDx === 0 && bestDy === 0) { bestDx = -punk.lastDirX; bestDy = -punk.lastDirY; }
            punk.dirX = bestDx; punk.dirY = bestDy;
          }
        }

        punk.pixelX = (punk.gridX + punk.dirX * punk.progress) * this.tileSize + this.tileSize / 2;
        punk.pixelY = (punk.gridY + punk.dirY * punk.progress) * this.tileSize + this.tileSize / 2;
        continue;
      }

      // ── Waiting to respawn ───────────────────────────────────────────────
      if (punk.respawnTimer > 0) {
        punk.respawnTimer--;
        if (punk.respawnTimer === 0) {
          punk.gridX = punk.spawnX;
          punk.gridY = punk.spawnY;
          punk.pixelX = punk.spawnX * this.tileSize + this.tileSize / 2;
          punk.pixelY = punk.spawnY * this.tileSize + this.tileSize / 2;
          punk.dirX = 0;
          punk.dirY = 0;
          punk.lastDirX = 0;
          punk.lastDirY = 0;
          punk.progress = 0;
          punk.flashing = false;
        }
        continue;
      }

      // ── Normal / scared movement ─────────────────────────────────────────
      // Choose initial direction when idle (just spawned or just arrived)
      if (punk.dirX === 0 && punk.dirY === 0) {
        const reverse = this.sigReverse && (punk.lastDirX !== 0 || punk.lastDirY !== 0);
        this.steerPunk(punk, i, reverse);
      }

      const speed = this.powered ? ghostScared : ghostNormal;
      punk.progress += speed;

      if (punk.progress >= 1.0) {
        punk.gridX += punk.dirX;
        punk.gridY += punk.dirY;
        punk.progress -= 1.0;
        punk.lastDirX = punk.dirX;
        punk.lastDirY = punk.dirY;
        punk.dirX = 0;
        punk.dirY = 0;

        const reverse = this.sigReverse;
        this.steerPunk(punk, i, reverse);
      }

      punk.pixelX = (punk.gridX + punk.dirX * punk.progress) * this.tileSize + this.tileSize / 2;
      punk.pixelY = (punk.gridY + punk.dirY * punk.progress) * this.tileSize + this.tileSize / 2;
    }

    // Clear reversal signal once all ghosts have had a chance to act on it
    this.sigReverse = false;
  }

  /**
   * Authentic Pac-Man ghost steering:
   * - Cannot reverse direction (unless forced by mode change or dead-end)
   * - Pick valid non-reverse walkable neighbor closest to target tile
   * - In scared mode: pick neighbor farthest from player
   */
  private steerPunk(punk: PunkState, idx: number, forceReverse = false) {
    if (forceReverse && (punk.lastDirX !== 0 || punk.lastDirY !== 0)) {
      const rdx = -punk.lastDirX;
      const rdy = -punk.lastDirY;
      if (isWalkable(this.maze, punk.gridX + rdx, punk.gridY + rdy)) {
        punk.dirX = rdx;
        punk.dirY = rdy;
        return;
      }
    }

    // Determine target tile
    let target: { x: number; y: number };
    if (this.powered) {
      // Scared: flee to designated corner (BFS-free — use Euclidean to maximize distance)
      target = { x: this.pGridX, y: this.pGridY }; // we'll maximize distance from this
    } else if (this.inScatter) {
      target = SCATTER_CORNERS[idx % SCATTER_CORNERS.length];
    } else {
      target = { x: this.pGridX, y: this.pGridY };
    }

    const DIRS = [
      { dx: 0, dy: -1 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 1, dy: 0 },
    ];

    let bestDx = 0, bestDy = 0;
    let bestScore = this.powered ? -Infinity : Infinity;

    for (const { dx, dy } of DIRS) {
      // Never reverse unless forced
      if (dx === -punk.lastDirX && dy === -punk.lastDirY) continue;

      const nx = punk.gridX + dx;
      const ny = punk.gridY + dy;
      if (!isWalkable(this.maze, nx, ny)) continue;

      const dist = Math.hypot(nx - target.x, ny - target.y);

      if (this.powered) {
        // Maximize distance from player
        if (dist > bestScore) { bestScore = dist; bestDx = dx; bestDy = dy; }
      } else {
        // Minimize distance to target
        if (dist < bestScore) { bestScore = dist; bestDx = dx; bestDy = dy; }
      }
    }

    if (bestDx !== 0 || bestDy !== 0) {
      punk.dirX = bestDx;
      punk.dirY = bestDy;
    } else {
      // Dead end: forced reversal
      punk.dirX = -punk.lastDirX;
      punk.dirY = -punk.lastDirY;
    }
  }

  // ── Bonus fruit ───────────────────────────────────────────────────────────

  private spawnFruit() {
    const idx = getFruitIndex(this.level);
    this.fruit = {
      pixelX: FRUIT_GRID_X * this.tileSize + this.tileSize / 2,
      pixelY: FRUIT_GRID_Y * this.tileSize + this.tileSize / 2,
      label:  FRUIT_LABEL_TABLE[idx],
      score:  FRUIT_SCORE_TABLE[idx],
      timer:  FRUIT_DURATION,
    };
  }

  private tickFruit() {
    if (!this.fruit) return;
    this.fruit.timer--;
    if (this.fruit.timer <= 0) { this.fruit = null; return; }

    // Check if player collected the fruit (pixel distance)
    const px = this.playerPixelX();
    const py = this.playerPixelY();
    const dx = px - this.fruit.pixelX;
    const dy = py - this.fruit.pixelY;
    const hitPx = FRUIT_HIT_RADIUS * this.tileSize;
    if (dx * dx + dy * dy < hitPx * hitPx) {
      this.score += this.fruit.score;
      this.fruit = null;
    }
  }

  // ── Collision ──────────────────────────────────────────────────────────────

  private checkCollisions() {
    const px = this.playerPixelX();
    const py = this.playerPixelY();
    const hitRadius = this.tileSize * 0.6;

    for (const punk of this.punks) {
      // Skip punks that are going home or waiting to respawn — they can't harm or be hit
      if (punk.goingHome || punk.respawnTimer > 0) continue;

      const gridHit = punk.gridX === this.pGridX && punk.gridY === this.pGridY;
      const dx = punk.pixelX - px;
      const dy = punk.pixelY - py;
      const pixelHit = Math.sqrt(dx * dx + dy * dy) < hitRadius;

      if (gridHit || pixelHit) {
        if (this.powered) {
          // Eaten — send back to spawn at 2× speed, like the original
          punk.goingHome = true;
          punk.flashing = false;
          // Award doubling score: 200 → 400 → 800 → 1600
          const EAT_SCORES = [200, 400, 800, 1600];
          this.score += EAT_SCORES[Math.min(this.punksEatenInPower, EAT_SCORES.length - 1)];
          this.punksEatenInPower++;
          // Start the first move toward home
          const DIRS = [{ dx: 0, dy: -1 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 0 }];
          let bestDx = punk.dirX || 1, bestDy = punk.dirY || 0;
          let bestDist = Infinity;
          for (const { dx: ddx, dy: ddy } of DIRS) {
            const nx = punk.gridX + ddx, ny = punk.gridY + ddy;
            if (!isWalkable(this.maze, nx, ny)) continue;
            const d = Math.hypot(nx - punk.spawnX, ny - punk.spawnY);
            if (d < bestDist) { bestDist = d; bestDx = ddx; bestDy = ddy; }
          }
          punk.dirX = bestDx;
          punk.dirY = bestDy;
          punk.progress = 0;
        } else {
          this.handleDeath();
          return;
        }
      }
    }
  }

  private handleDeath() {
    this.lives--;
    this.phase = this.lives <= 0 ? "gameover" : "dead";
  }

  // ── State snapshot ─────────────────────────────────────────────────────────

  getState(): GameState {
    return {
      maze: this.maze.map((row) => [...row]),
      player: {
        gridX: this.pGridX,
        gridY: this.pGridY,
        pixelX: this.playerPixelX(),
        pixelY: this.playerPixelY(),
        dirX: this.pDirX,
        dirY: this.pDirY,
        moving: this.pMoving,
      },
      punks: this.punks.map((p) => ({ ...p })),
      phase: this.phase,
      brainsCollected: this.brainsCollected,
      totalBrains: this.totalBrains,
      lives: this.lives,
      powered: this.powered,
      powerTimer: this.powerTimer,
      tileSize: this.tileSize,
      level: this.level,
      inScatter: this.inScatter,
      score: this.score,
      levelTimerTicks: this.levelTimerTicks,
      lastLevelTimeBonus: this.lastLevelTimeBonus,
      lastLevelTimeBonusRank: this.lastLevelTimeBonusRank,
      fruit: this.fruit ? { ...this.fruit } : null,
    };
  }
}
