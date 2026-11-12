import { THEME_IDS, type ThemeId } from "./themes.ts";

// Brisa Rush — pure game logic (no DOM). A top-down three-lane city run:
// the street scrolls toward the player, who changes lane or jumps.

export const RUSH_WIDTH = 360;
export const RUSH_HEIGHT = 480;
export const LANE_CENTERS = [60, 180, 300] as const;
export const PLAYER_Y = 400;

const PLAYER_HALF = 11; // hitbox half-size (drawn at 15)
const LANE_SWITCH_SPEED = 1100; // px/s — a lane change takes ~0.11s
// A jump covers a fixed stretch of street, not a fixed time, so airtime
// shortens as the run speeds up and two rows in a row stay jumpable.
export const JUMP_DISTANCE = 150;
const JUMP_CLEAR_FROM = 0.08; // fraction of the jump that is airborne enough to clear a low barrier
const JUMP_CLEAR_TO = 0.92;
export const START_SPEED = 250;
export const MAX_SPEED = 520;
const SPEED_GAIN = 6; // px/s gained per second survived
const GRACE_DISTANCE = 380; // nothing spawns during the first stretch
export const TOKEN_POINTS = 25;
export const MAX_COMBO = 5;
const COMBO_WINDOW = 3; // seconds between pickups to keep a combo going

export type ObstacleKind = "low" | "tall" | "cone" | "puddle" | "marker";
export type Obstacle = { lane: number; y: number; kind: ObstacleKind; taken?: boolean; theme?: ThemeId };

export type RushState = {
  time: number;
  distance: number;
  speed: number;
  lane: number;
  x: number;
  jump: number; // street distance of jump remaining
  obstacles: Obstacle[];
  rowsSpawned: number;
  nextRowAt: number;
  freeLane: number;
  markers: number;
  tokenPoints: number;
  combo: number;
  lastPickupAt: number;
  collected: Partial<Record<ThemeId, number>>;
  seed: number;
  status: "playing" | "over";
};

export const OBSTACLE_HALF_HEIGHT: Record<ObstacleKind, number> = { low: 8, tall: 28, cone: 13, puddle: 6, marker: 9 };
export const OBSTACLE_HALF_WIDTH: Record<ObstacleKind, number> = { low: 42, tall: 38, cone: 20, puddle: 46, marker: 9 };

// mulberry32: tiny deterministic PRNG so runs are testable.
function random(state: RushState) {
  state.seed = (state.seed + 0x6d2b79f5) | 0;
  let t = state.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function createRushState(seed = Date.now()): RushState {
  return {
    time: 0,
    distance: 0,
    speed: START_SPEED,
    lane: 1,
    x: LANE_CENTERS[1],
    jump: 0,
    obstacles: [],
    rowsSpawned: 0,
    nextRowAt: GRACE_DISTANCE,
    freeLane: 1,
    markers: 0,
    tokenPoints: 0,
    combo: 0,
    lastPickupAt: -Infinity,
    collected: {},
    seed: seed | 0,
    status: "playing",
  };
}

export function rushScore(state: RushState) {
  return Math.floor(state.distance / 10) + state.tokenPoints;
}

export function speedAt(time: number) {
  return Math.min(MAX_SPEED, START_SPEED + time * SPEED_GAIN);
}

export function moveLane(state: RushState, direction: -1 | 1) {
  if (state.status !== "playing") return false;
  const next = Math.max(0, Math.min(LANE_CENTERS.length - 1, state.lane + direction));
  if (next === state.lane) return false;
  state.lane = next;
  return true;
}

export function jump(state: RushState) {
  if (state.status !== "playing" || state.jump > 0) return false;
  state.jump = JUMP_DISTANCE;
  return true;
}

export function isAirborne(state: RushState) {
  if (state.jump <= 0) return false;
  const progress = 1 - state.jump / JUMP_DISTANCE;
  return progress >= JUMP_CLEAR_FROM && progress <= JUMP_CLEAR_TO;
}

// Spawns one row. The first two rows teach the two moves; after that every
// row keeps a way through that is at most one lane from the last one.
function spawnRow(state: RushState) {
  const row = state.rowsSpawned;
  const y = -40;
  if (row === 0) {
    state.obstacles.push({ lane: 1, y, kind: "tall" });
    state.freeLane = 0;
  } else if (row === 1) {
    for (let lane = 0; lane < 3; lane += 1) state.obstacles.push({ lane, y, kind: "low" });
  } else {
    const shift = Math.floor(random(state) * 3) - 1;
    const free = Math.max(0, Math.min(2, state.freeLane + shift));
    state.freeLane = free;
    const others = [0, 1, 2].filter((lane) => lane !== free);
    const pattern = row % 6;
    if (pattern === 0) {
      state.obstacles.push({ lane: others[0], y, kind: "tall" });
    } else if (pattern === 1) {
      state.obstacles.push({ lane: others[0], y, kind: "cone" });
    } else if (pattern === 2) {
      state.obstacles.push({ lane: others[1], y: y - 42, kind: "low" });
      state.obstacles.push({ lane: others[0], y, kind: "tall" });
    } else if (pattern === 3) {
      state.obstacles.push({ lane: others[0], y, kind: "tall" });
    } else if (pattern === 4) {
      state.obstacles.push({ lane: others[0], y, kind: "puddle" });
    } else {
      state.obstacles.push({ lane: others[0], y, kind: "tall" });
    }
    if (random(state) < 0.55) state.obstacles.push({ lane: free, y: y - 70, kind: "marker", theme: THEME_IDS[Math.floor(random(state) * THEME_IDS.length)] });
  }
  state.rowsSpawned += 1;
  // Keep enough runway for a lane change or a full jump, even as patterns
  // become more layered later in a run.
  const gap = Math.max(230, 300 - state.time * 1.4);
  state.nextRowAt = state.distance + gap;
}

export function stepRush(state: RushState, dt: number): RushState["status"] {
  if (state.status !== "playing") return state.status;
  state.time += dt;
  state.speed = speedAt(state.time);
  const travel = state.speed * dt;
  state.distance += travel;
  state.jump = Math.max(0, state.jump - travel);

  const target = LANE_CENTERS[state.lane];
  const step = LANE_SWITCH_SPEED * dt;
  state.x = Math.abs(target - state.x) <= step ? target : state.x + Math.sign(target - state.x) * step;

  while (state.distance >= state.nextRowAt) spawnRow(state);

  for (const obstacle of state.obstacles) {
    const wasAhead = obstacle.y <= PLAYER_Y + 30;
    obstacle.y += travel;
    // A token that slips past breaks the combo.
    if (obstacle.kind === "marker" && !obstacle.taken && wasAhead && obstacle.y > PLAYER_Y + 30) state.combo = 0;
  }
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.y < RUSH_HEIGHT + 60 && !obstacle.taken);

  for (const obstacle of state.obstacles) {
    const dx = Math.abs(LANE_CENTERS[obstacle.lane] - state.x);
    const dy = Math.abs(obstacle.y - PLAYER_Y);
    if (dx >= OBSTACLE_HALF_WIDTH[obstacle.kind] + PLAYER_HALF || dy >= OBSTACLE_HALF_HEIGHT[obstacle.kind] + PLAYER_HALF) continue;
    if (obstacle.kind === "marker") {
      obstacle.taken = true;
      state.markers += 1;
      state.combo = state.time - state.lastPickupAt <= COMBO_WINDOW ? Math.min(MAX_COMBO, state.combo + 1) : 1;
      state.lastPickupAt = state.time;
      state.tokenPoints += TOKEN_POINTS * state.combo;
      if (obstacle.theme) state.collected[obstacle.theme] = (state.collected[obstacle.theme] ?? 0) + 1;
    } else if (obstacle.kind === "tall" || !isAirborne(state)) {
      state.status = "over";
      return state.status;
    }
  }
  state.obstacles = state.obstacles.filter((obstacle) => !obstacle.taken);
  return state.status;
}
