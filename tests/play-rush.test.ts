import test from "node:test";
import assert from "node:assert/strict";
import {
  LANE_CENTERS, MAX_SPEED, PLAYER_Y, START_SPEED, createRushState, jump, moveLane, rushScore, speedAt, stepRush, type RushState,
} from "../lib/play/rush.ts";

const FRAME = 1 / 60;

test("lane changes stay inside the three lanes", () => {
  const state = createRushState(1);
  assert.equal(moveLane(state, -1), true);
  assert.equal(moveLane(state, -1), false);
  assert.equal(state.lane, 0);
  moveLane(state, 1); moveLane(state, 1); moveLane(state, 1);
  assert.equal(state.lane, 2);
  for (let i = 0; i < 20; i += 1) stepRush(state, FRAME);
  assert.equal(state.x, LANE_CENTERS[2], "the runner slides to the lane centre");
});

test("hitting a tall block ends the run, even mid-jump", () => {
  const state = createRushState(1);
  state.nextRowAt = Infinity;
  state.obstacles.push({ lane: 1, y: PLAYER_Y - 30, kind: "tall" });
  jump(state);
  for (let i = 0; i < 10; i += 1) stepRush(state, FRAME);
  assert.equal(state.status, "over");
});

test("a low barrier is cleared by jumping and ends the run otherwise", () => {
  const jumping = createRushState(1);
  jumping.nextRowAt = Infinity;
  jumping.obstacles.push({ lane: 1, y: PLAYER_Y - 60, kind: "low" });
  jump(jumping);
  for (let i = 0; i < 40; i += 1) stepRush(jumping, FRAME);
  assert.equal(jumping.status, "playing");

  const grounded = createRushState(1);
  grounded.nextRowAt = Infinity;
  grounded.obstacles.push({ lane: 1, y: PLAYER_Y - 60, kind: "low" });
  for (let i = 0; i < 40; i += 1) stepRush(grounded, FRAME);
  assert.equal(grounded.status, "over");
});

test("markers are collected and add to the score", () => {
  const state = createRushState(1);
  state.nextRowAt = Infinity;
  state.obstacles.push({ lane: 1, y: PLAYER_Y - 20, kind: "marker" });
  for (let i = 0; i < 10; i += 1) stepRush(state, FRAME);
  assert.equal(state.markers, 1);
  assert.equal(rushScore(state), Math.floor(state.distance / 10) + 25);
});

test("score grows with distance and speed rises to a cap", () => {
  const state = createRushState(1);
  state.nextRowAt = Infinity;
  const before = rushScore(state);
  for (let i = 0; i < 120; i += 1) stepRush(state, FRAME);
  assert.ok(rushScore(state) > before);
  assert.ok(state.speed > START_SPEED);
  assert.equal(speedAt(0), START_SPEED);
  assert.equal(speedAt(10_000), MAX_SPEED);
});

test("the first rows teach dodging, then jumping", () => {
  const state = createRushState(7);
  state.distance = state.nextRowAt;
  stepRush(state, 0);
  assert.deepEqual(state.obstacles.map((obstacle) => [obstacle.lane, obstacle.kind]), [[1, "tall"]]);
  state.obstacles = [];
  state.distance = state.nextRowAt;
  stepRush(state, 0);
  assert.deepEqual(state.obstacles.map((obstacle) => obstacle.kind), ["low", "low", "low"]);
});

test("restart gives a clean run", () => {
  const state = createRushState(3);
  assert.equal(state.status, "playing");
  assert.equal(state.distance, 0);
  assert.equal(state.lane, 1);
  assert.equal(state.obstacles.length, 0);
});

// A simple bot that dodges tall blocks and jumps low barriers must survive
// long runs on many seeds: no pattern is ever impossible.
function botSurvives(seed: number, seconds: number) {
  const state: RushState = createRushState(seed);
  for (let i = 0; i < seconds * 60 && state.status === "playing"; i += 1) {
    const ahead = state.obstacles.filter((obstacle) => obstacle.kind !== "marker" && obstacle.y < PLAYER_Y && obstacle.y > PLAYER_Y - 170);
    const nearestY = Math.max(-Infinity, ...ahead.map((obstacle) => obstacle.y));
    const row = ahead.filter((obstacle) => Math.abs(obstacle.y - nearestY) < 1);
    const blockedTall = new Set(row.filter((obstacle) => obstacle.kind === "tall").map((obstacle) => obstacle.lane));
    const low = new Set(row.filter((obstacle) => obstacle.kind !== "tall").map((obstacle) => obstacle.lane));
    if (blockedTall.has(state.lane)) {
      const options = [0, 1, 2].filter((lane) => !blockedTall.has(lane)).sort((a, b) => Number(low.has(a)) - Number(low.has(b)) || Math.abs(a - state.lane) - Math.abs(b - state.lane));
      if (options[0] !== undefined) moveLane(state, options[0] > state.lane ? 1 : -1);
    } else if (low.has(state.lane) && PLAYER_Y - nearestY < 70) {
      jump(state);
    }
    stepRush(state, FRAME);
  }
  return state.status === "playing";
}

test("patterns are always passable", () => {
  for (let seed = 1; seed <= 10; seed += 1) assert.equal(botSurvives(seed, 120), true, `seed ${seed}`);
});
