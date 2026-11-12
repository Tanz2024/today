import { themeForIndex, type ThemeId } from "./themes.ts";

// Brisa Obby — pure game logic (no DOM). The runner moves right on its own;
// the player only jumps. Coordinates: a 360×480 view that scrolls
// horizontally through a longer level. `y` values are measured downward.

export const OBBY_WIDTH = 360;
export const OBBY_HEIGHT = 480;
export const GROUND_Y = 380;
export const PLAYER_SCREEN_X = 84; // a little further left, to keep look-ahead with the world zoom

export const GRAVITY = 2000;
export const JUMP_VELOCITY = -640; // apex ≈ 102px, airtime ≈ 0.64s
export const COYOTE_SECONDS = 0.1; // can still jump just after running off an edge
export const JUMP_BUFFER_SECONDS = 0.14; // a jump pressed just before landing still counts
const HITBOX_INSET = 4; // collisions use a slightly smaller box than drawn
/** Gap between the ground and the bottom of a floating (`air`) obstacle. */
export const AIR_CLEARANCE = 34;
export const ROLL_TRIGGER = 260;
export const CHECKPOINT_SPACING = 500;

export const PLAYER_WIDTH = 22;
export const PLAYER_HEIGHT = 26;

export type Segment = { x: number; w: number };
export type Platform = { x: number; y: number; w: number; move?: { range: number; period: number } };
/**
 * Obstacles. Ground objects are jumped over. `air` objects float at head
 * height: standing runs underneath, jumping hits them. `roll` objects start
 * rolling toward the runner once it is ROLL_TRIGGER px away, at `roll` × the
 * run speed. Their position depends only on the runner's x, so a checkpoint
 * restart always meets them in the same place.
 */
export type Hazard = { x: number; w: number; h: number; air?: boolean; roll?: number };
export type ObbyLevel = { name: string; speed: number; length: number; ground: Segment[]; platforms: Platform[]; hazards: Hazard[] };
export type StoryToken = { x: number; y: number; theme: ThemeId };

export const TOKEN_POINTS = 50;
export const COMPLETE_BONUS = 250;
const TOKEN_REACH = 30; // generous pickup radius around the runner's centre

export type ObbyState = {
  level: number;
  checkpoint: number;
  time: number;
  player: { x: number; y: number; vy: number; onGround: boolean };
  coyote: number;
  jumpBuffer: number;
  jumps: number;
  status: "playing" | "failed" | "complete";
  failure: "gap" | "hazard" | null;
  collected: number[];
};

// Builds solid ground from a list of gaps (start x and width).
function groundWithGaps(length: number, gaps: Array<[number, number]>): Segment[] {
  const segments: Segment[] = [];
  let cursor = -200;
  for (const [start, width] of [...gaps].sort((a, b) => a[0] - b[0])) {
    segments.push({ x: cursor, w: start - cursor });
    cursor = start + width;
  }
  segments.push({ x: cursor, w: length + 400 - cursor });
  return segments;
}

// Deterministic levels, easy to hard. Each early phase introduces one idea;
// later phases combine them. Every jump fits well inside the jump arc
// (≈96px horizontal at the slowest speed, ≈102px vertical).
export const OBBY_LEVELS: ObbyLevel[] = [
  {
    name: "First steps",
    speed: 150,
    length: 3000,
    ground: groundWithGaps(3000, [[450, 44], [1250, 56], [1900, 60], [2550, 60]]),
    platforms: [],
    hazards: [{ x: 850, w: 24, h: 18 }, { x: 1600, w: 26, h: 20 }, { x: 2250, w: 26, h: 22 }],
  },
  {
    name: "Watch your feet",
    speed: 155,
    length: 3700,
    ground: groundWithGaps(3700, [[700, 60], [1500, 64], [2500, 66], [3150, 60]]),
    platforms: [],
    // Introduce an overhead obstacle early so the run is about choosing when
    // to jump, not only clearing floor objects.
    hazards: [{ x: 1050, w: 26, h: 22 }, { x: 1900, w: 26, h: 24 }, { x: 2150, w: 30, h: 22, air: true }, { x: 2880, w: 26, h: 26 }],
  },
  {
    name: "Island hopping",
    speed: 155,
    length: 4000,
    ground: groundWithGaps(4000, [[800, 150], [1600, 170], [2500, 160], [3200, 180]]),
    platforms: [
      { x: 850, y: GROUND_Y - 44, w: 60 },
      { x: 1645, y: GROUND_Y - 50, w: 64 },
      { x: 2550, y: GROUND_Y - 46, w: 64 },
      { x: 3245, y: GROUND_Y - 52, w: 64 },
    ],
    hazards: [{ x: 1350, w: 26, h: 22, roll: 0.5 }, { x: 2100, w: 26, h: 22 }, { x: 2900, w: 30, h: 16, air: true }],
  },
  {
    name: "Moving parts",
    speed: 160,
    length: 4300,
    ground: groundWithGaps(4300, [[900, 200], [2000, 64], [2600, 200], [3500, 64]]),
    platforms: [
      { x: 944, y: GROUND_Y - 40, w: 110, move: { range: 20, period: 3.2 } },
      { x: 2644, y: GROUND_Y - 40, w: 110, move: { range: 20, period: 3 } },
    ],
    hazards: [{ x: 1600, w: 26, h: 22 }, { x: 2300, w: 28, h: 24 }, { x: 3850, w: 26, h: 24 }, { x: 1450, w: 26, h: 22, roll: 0.5 }],
  },
  {
    name: "Up and over",
    speed: 165,
    length: 4700,
    ground: groundWithGaps(4700, [[800, 64], [1500, 260], [2600, 66], [3200, 200], [4100, 60]]),
    platforms: [
      { x: 1540, y: GROUND_Y - 46, w: 64 },
      { x: 1660, y: GROUND_Y - 84, w: 64 },
      { x: 3247, y: GROUND_Y - 40, w: 110, move: { range: 20, period: 3 } },
    ],
    hazards: [{ x: 1150, w: 26, h: 22 }, { x: 2900, w: 28, h: 24 }, { x: 3700, w: 26, h: 22 }, { x: 3900, w: 26, h: 26 }, { x: 2200, w: 30, h: 16, air: true }],
  },
  {
    name: "Split route",
    speed: 165,
    length: 5000,
    ground: groundWithGaps(5000, [[900, 60], [1450, 64], [2350, 60], [3000, 66], [4200, 60]]),
    platforms: [],
    hazards: [{ x: 520, w: 28, h: 18 }, { x: 1120, w: 26, h: 20 }, { x: 1900, w: 30, h: 22 }, { x: 3650, w: 28, h: 20 }, { x: 2750, w: 26, h: 22, roll: 0.5 }, { x: 4700, w: 30, h: 16, air: true }],
  },
  {
    name: "Mixed signals",
    speed: 170,
    length: 5300,
    ground: groundWithGaps(5300, [[780, 60], [1250, 64], [2200, 60], [2750, 66], [3650, 64], [4700, 60]]),
    platforms: [],
    hazards: [{ x: 520, w: 26, h: 20 }, { x: 1450, w: 30, h: 22 }, { x: 3150, w: 28, h: 24 }, { x: 4050, w: 30, h: 20 }, { x: 1850, w: 30, h: 16, air: true }, { x: 4450, w: 26, h: 22, roll: 0.5 }],
  },
  // Harder phases: faster runs, obstacles in pairs, and platform chains.
  {
    name: "Lunch rush",
    speed: 172,
    length: 5200,
    ground: groundWithGaps(5200, [[700, 60], [1500, 64], [2400, 60], [3300, 66], [4300, 60]]),
    platforms: [],
    hazards: [
      { x: 1050, w: 26, h: 22 }, { x: 1060, w: 26, h: 20 }, { x: 1900, w: 28, h: 24 },
      { x: 2800, w: 26, h: 22 }, { x: 2810, w: 26, h: 24 }, { x: 3700, w: 30, h: 22 },
      { x: 4700, w: 26, h: 20 }, { x: 4710, w: 26, h: 24 }, { x: 1250, w: 30, h: 16, air: true }, { x: 2200, w: 26, h: 22, roll: 0.5 }, { x: 3950, w: 30, h: 16, air: true }],
  },
  {
    name: "Hallway sprint",
    speed: 180,
    length: 5600,
    ground: groundWithGaps(5600, [[600, 56], [1050, 60], [1500, 56], [2400, 64], [2850, 60], [3300, 64], [4200, 60], [4650, 64]]),
    platforms: [],
    hazards: [{ x: 1900, w: 28, h: 22 }, { x: 2150, w: 26, h: 24 }, { x: 3750, w: 30, h: 22 }, { x: 3950, w: 26, h: 20 }, { x: 5100, w: 28, h: 24 }],
  },
  {
    name: "Library leaps",
    speed: 170,
    length: 5400,
    ground: groundWithGaps(5400, [[900, 260], [1600, 60], [2000, 170], [2900, 260], [3600, 60], [4000, 200]]),
    platforms: [
      { x: 940, y: GROUND_Y - 46, w: 64 },
      { x: 1060, y: GROUND_Y - 84, w: 64 },
      { x: 2045, y: GROUND_Y - 50, w: 64 },
      { x: 2940, y: GROUND_Y - 46, w: 64 },
      { x: 3060, y: GROUND_Y - 84, w: 64 },
      { x: 4044, y: GROUND_Y - 40, w: 110, move: { range: 20, period: 3 } },
    ],
    hazards: [{ x: 2500, w: 28, h: 22 }, { x: 4600, w: 26, h: 24 }, { x: 4900, w: 30, h: 22 }, { x: 1400, w: 30, h: 16, air: true }, { x: 3500, w: 26, h: 22, roll: 0.5 }],
  },
  {
    name: "Gym class",
    speed: 175,
    length: 5600,
    ground: groundWithGaps(5600, [[800, 200], [2000, 200], [3400, 200], [4600, 200]]),
    platforms: [
      { x: 844, y: GROUND_Y - 40, w: 110, move: { range: 20, period: 3.2 } },
      { x: 2044, y: GROUND_Y - 40, w: 110, move: { range: 22, period: 2.6 } },
      { x: 3444, y: GROUND_Y - 40, w: 110, move: { range: 20, period: 2.8 } },
      { x: 4644, y: GROUND_Y - 40, w: 110, move: { range: 24, period: 2.4 } },
    ],
    hazards: [
      { x: 1400, w: 26, h: 22 }, { x: 1410, w: 26, h: 24 }, { x: 2700, w: 28, h: 22 },
      { x: 3000, w: 26, h: 20 }, { x: 4100, w: 30, h: 24 }, { x: 5200, w: 26, h: 22 }, { x: 1800, w: 26, h: 22, roll: 0.5 }, { x: 3200, w: 30, h: 16, air: true }],
  },
  {
    name: "Exam week",
    speed: 182,
    length: 6000,
    ground: groundWithGaps(6000, [[650, 60], [1200, 64], [2600, 260], [3500, 60], [4300, 200], [5300, 64]]),
    platforms: [
      { x: 2640, y: GROUND_Y - 46, w: 64 },
      { x: 2760, y: GROUND_Y - 84, w: 64 },
      { x: 4344, y: GROUND_Y - 40, w: 110, move: { range: 20, period: 2.8 } },
    ],
    hazards: [
      { x: 900, w: 26, h: 22 }, { x: 910, w: 26, h: 20 }, { x: 1600, w: 28, h: 24 }, { x: 1850, w: 26, h: 22 },
      { x: 2100, w: 30, h: 20 }, { x: 3100, w: 28, h: 24 }, { x: 3800, w: 26, h: 22 }, { x: 3810, w: 26, h: 24 },
      { x: 4800, w: 26, h: 22 }, { x: 5600, w: 30, h: 24 }, { x: 2350, w: 30, h: 16, air: true }, { x: 5100, w: 26, h: 22, roll: 0.5 }],
  },
  {
    name: "Final bell",
    speed: 188,
    length: 6400,
    ground: groundWithGaps(6400, [[600, 64], [1100, 66], [1700, 260], [2600, 64], [3100, 200], [4000, 66], [4500, 64], [5200, 260]]),
    platforms: [
      { x: 1740, y: GROUND_Y - 46, w: 64 },
      { x: 1860, y: GROUND_Y - 84, w: 64 },
      { x: 3144, y: GROUND_Y - 40, w: 110, move: { range: 22, period: 2.6 } },
      { x: 5240, y: GROUND_Y - 46, w: 64 },
      { x: 5360, y: GROUND_Y - 84, w: 64 },
    ],
    hazards: [
      { x: 850, w: 26, h: 22 }, { x: 1400, w: 26, h: 22 }, { x: 1410, w: 26, h: 24 }, { x: 2250, w: 30, h: 22 },
      { x: 2850, w: 26, h: 24 }, { x: 3600, w: 28, h: 22 }, { x: 4250, w: 26, h: 20 }, { x: 4800, w: 26, h: 22 },
      { x: 4810, w: 26, h: 24 }, { x: 5800, w: 30, h: 22 }, { x: 6100, w: 26, h: 24 }, { x: 3850, w: 30, h: 16, air: true }],
  },
];

// After the last phase the run loops, a little faster each time (capped), so
// a long run keeps getting harder instead of resetting to the easy start.
const LOOP_SPEEDUP = 0.08;
const MAX_LOOP_SPEED = 200; // above this, late jumps onto platform chains stop being fair

export function levelFor(level: number): ObbyLevel {
  const index = Math.max(0, level - 1);
  const base = OBBY_LEVELS[index % OBBY_LEVELS.length];
  const loop = Math.floor(index / OBBY_LEVELS.length);
  if (loop === 0) return base;
  return { ...base, speed: Math.min(MAX_LOOP_SPEED, Math.max(base.speed, Math.round(base.speed * (1 + loop * LOOP_SPEEDUP)))) };
}

export function createObbyState(level = 1): ObbyState {
  return {
    level: Math.max(1, level),
    checkpoint: 0,
    time: 0,
    player: { x: 40, y: GROUND_Y, vy: 0, onGround: true },
    coyote: 0,
    jumpBuffer: 0,
    jumps: 0,
    status: "playing",
    failure: null,
    collected: [],
  };
}

function gapsOf(level: ObbyLevel): Segment[] {
  const gaps: Segment[] = [];
  for (let i = 0; i < level.ground.length - 1; i += 1) {
    const end = level.ground[i].x + level.ground[i].w;
    gaps.push({ x: end, w: level.ground[i + 1].x - end });
  }
  return gaps;
}

// Story tokens are derived from the layout, so every level has them in the
// same places: one on each jump arc, one on each platform, and a couple on
// the ground for easy early points.
export function tokensFor(levelNo: number): StoryToken[] {
  const level = levelFor(levelNo);
  const gaps = gapsOf(level).filter((gap) => gap.x > 0 && gap.x < level.length);
  const hasPlatform = (gap: Segment) => level.platforms.some((platform) => platform.x < gap.x + gap.w && platform.x + platform.w > gap.x);
  // Ground tokens sit on solid ground, clear of gaps and hazards.
  const onSafeGround = (x: number) => {
    let spot = x;
    while (gaps.some((gap) => spot > gap.x - 40 && spot < gap.x + gap.w + 40) || level.hazards.some((hazard) => { const margin = hazard.air || hazard.roll ? 170 : 50; return spot > hazard.x - margin && spot < hazard.x + hazard.w + margin; })) spot += 40;
    return spot;
  };
  const points: Array<{ x: number; y: number }> = [
    ...gaps.filter((gap) => !hasPlatform(gap)).map((gap) => ({ x: gap.x + gap.w / 2, y: GROUND_Y - 86 })),
    ...level.platforms.map((platform) => ({ x: platform.x + platform.w / 2, y: platform.y - 26 })),
    { x: onSafeGround(330), y: GROUND_Y - 16 },
    { x: onSafeGround(Math.round(level.length * 0.55)), y: GROUND_Y - 16 },
    // Bonus tokens float over flat ground: only a deliberate extra jump gets them.
    { x: onSafeGround(Math.round(level.length * 0.3)), y: GROUND_Y - 84 },
    { x: onSafeGround(Math.round(level.length * 0.8)), y: GROUND_Y - 84 },
  ];
  return points
    .sort((a, b) => a.x - b.x)
    .map((point, index) => ({ ...point, theme: themeForIndex(levelNo * 3 + index) }));
}

export function obbyLevelScore(state: ObbyState) {
  const level = levelFor(state.level);
  if (state.status !== "complete") return 0;
  const par = level.length / level.speed + 2;
  return COMPLETE_BONUS + Math.max(0, Math.round((par - state.time) * 10));
}

/** Current left edge of an obstacle, given where the runner is. */
export function hazardX(hazard: Hazard, playerX: number) {
  if (!hazard.roll) return hazard.x;
  return hazard.x - hazard.roll * Math.max(0, playerX - (hazard.x - ROLL_TRIGGER));
}

/** Top and bottom (y) of an obstacle's body. */
export function hazardBand(hazard: Hazard) {
  const bottom = hazard.air ? GROUND_Y - AIR_CLEARANCE : GROUND_Y;
  return { top: bottom - hazard.h, bottom };
}

// Horizontal offset of a moving platform at a given time.
export function platformX(platform: Platform, time: number) {
  if (!platform.move) return platform.x;
  return platform.x + Math.sin((time / platform.move.period) * Math.PI * 2) * platform.move.range;
}

export function requestJump(state: ObbyState) {
  if (state.status === "playing") state.jumpBuffer = JUMP_BUFFER_SECONDS;
}

// Surfaces the player can stand on at this moment: ground at GROUND_Y plus
// one-way platforms (landable from above, passable from below).
function surfaces(level: ObbyLevel, time: number) {
  return [
    ...level.ground.map((segment) => ({ x: segment.x, w: segment.w, y: GROUND_Y })),
    ...level.platforms.map((platform) => ({ x: platformX(platform, time), w: platform.w, y: platform.y })),
  ];
}

function overlapsHorizontally(x: number, surface: { x: number; w: number }) {
  const left = x - PLAYER_WIDTH / 2 + HITBOX_INSET;
  const right = x + PLAYER_WIDTH / 2 - HITBOX_INSET;
  return right > surface.x && left < surface.x + surface.w;
}

export function stepObby(state: ObbyState, dt: number): ObbyState["status"] {
  if (state.status !== "playing") return state.status;
  const level = levelFor(state.level);
  const player = state.player;
  const before = surfaces(level, state.time);
  state.time += dt;
  state.checkpoint = Math.max(state.checkpoint, Math.floor(state.player.x / 500));
  const after = surfaces(level, state.time);

  // Ride a moving platform the player is standing on.
  if (player.onGround) {
    const index = before.findIndex((surface) => surface.y === player.y && overlapsHorizontally(player.x, surface));
    if (index >= 0) player.x += after[index].x - before[index].x;
  }

  state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
  state.coyote = player.onGround ? COYOTE_SECONDS : Math.max(0, state.coyote - dt);
  if (state.jumpBuffer > 0 && (player.onGround || state.coyote > 0)) {
    player.vy = JUMP_VELOCITY;
    player.onGround = false;
    state.coyote = 0;
    state.jumpBuffer = 0;
    state.jumps += 1;
  }

  const previousY = player.y;
  player.x += level.speed * dt;
  player.vy = Math.min(player.vy + GRAVITY * dt, 1400);
  player.y += player.vy * dt;

  // Land only when falling through a surface's top edge this frame.
  player.onGround = false;
  if (player.vy >= 0) {
    for (const surface of after) {
      if (overlapsHorizontally(player.x, surface) && previousY <= surface.y + 1 && player.y >= surface.y) {
        player.y = surface.y;
        player.vy = 0;
        player.onGround = true;
        break;
      }
    }
  }

  // Hazards: generous box — the drawn player is bigger than its hitbox.
  const left = player.x - PLAYER_WIDTH / 2 + HITBOX_INSET;
  const right = player.x + PLAYER_WIDTH / 2 - HITBOX_INSET;
  const top = player.y - PLAYER_HEIGHT + HITBOX_INSET;
  for (const hazard of level.hazards) {
    const x = hazardX(hazard, player.x);
    const band = hazardBand(hazard);
    if (right > x + 3 && left < x + hazard.w - 3 && player.y > band.top + 3 && top < band.bottom) {
      state.status = "failed";
      state.failure = "hazard";
      return state.status;
    }
  }

  // Story tokens: a generous reach around the runner's centre.
  const centerY = player.y - PLAYER_HEIGHT / 2;
  tokensFor(state.level).forEach((token, index) => {
    if (state.collected.includes(index)) return;
    if (Math.hypot(token.x - player.x, token.y - centerY) <= TOKEN_REACH) state.collected.push(index);
  });

  // Touching the floor means falling below the ground line through a gap.
  if (player.y > GROUND_Y + 60) {
    state.status = "failed";
    state.failure = "gap";
    return state.status;
  }

  // Obby is a continuous run: reaching a school section rolls directly into
  // the next, harder section instead of stopping at a finish screen.
  if (player.x >= level.length) {
    state.level += 1;
    player.x = 40;
    player.y = GROUND_Y;
    player.vy = 0;
    player.onGround = true;
    state.collected = [];
    state.checkpoint = 0;
  }
  return state.status;
}

export function cameraX(state: ObbyState) {
  return state.player.x - PLAYER_SCREEN_X;
}

export function levelProgress(state: ObbyState) {
  return Math.min(1, Math.max(0, state.player.x / levelFor(state.level).length));
}

/**
 * Restart after a fall from the last checkpoint instead of the section start.
 * The runner goes back to a safe spot on solid ground at or before the
 * checkpoint; stories collected before that spot are kept. The clock keeps
 * running, so a checkpoint restart can never earn a faster-time bonus.
 */
export function respawnAtCheckpoint(state: ObbyState): ObbyState {
  const level = levelFor(state.level);
  const target = Math.max(40, state.checkpoint * CHECKPOINT_SPACING);
  const safe = (x: number) =>
    level.ground.some((segment) => x - 40 >= segment.x && x + 40 <= segment.x + segment.w)
    && level.hazards.every((hazard) => {
      // A rolling obstacle meets the runner a little before its start point.
      const meet = hazard.roll ? hazard.x - (hazard.roll * ROLL_TRIGGER) / (1 + hazard.roll) : hazard.x;
      return x + 120 < Math.min(hazard.x, meet) || x - 40 > Math.max(hazard.x, meet) + hazard.w;
    });
  let x = target;
  while (x > 40 && !safe(x)) x -= 10;
  if (!safe(x)) x = 40;
  const tokens = tokensFor(state.level);
  return {
    ...state,
    status: "playing",
    failure: null,
    coyote: 0,
    jumpBuffer: 0,
    player: { x, y: GROUND_Y, vy: 0, onGround: true },
    collected: state.collected.filter((index) => tokens[index].x < x),
  };
}
