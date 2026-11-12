import test from "node:test";
import assert from "node:assert/strict";
import {
  GROUND_Y, JUMP_VELOCITY, OBBY_LEVELS, PLAYER_HEIGHT, hazardX, respawnAtCheckpoint, hazardBand, PLAYER_WIDTH, createObbyState, levelFor, platformX, requestJump, stepObby, type ObbyState,
} from "../lib/play/obby.ts";

const FRAME = 1 / 60;

function steps(state: ObbyState, count: number) {
  for (let i = 0; i < count; i += 1) stepObby(state, FRAME);
}

test("a jump request launches the runner only from the ground", () => {
  const state = createObbyState(1);
  requestJump(state);
  stepObby(state, FRAME);
  assert.equal(state.jumps, 1);
  assert.ok(state.player.vy < 0 && state.player.vy > JUMP_VELOCITY, "moving up, slowed by gravity");
  requestJump(state);
  steps(state, 5);
  assert.equal(state.jumps, 1, "no second jump in the air");
});

test("gravity brings the runner back down and it lands on the ground", () => {
  const state = createObbyState(1);
  requestJump(state);
  steps(state, 10);
  assert.ok(state.player.y < GROUND_Y);
  steps(state, 60);
  assert.equal(state.player.y, GROUND_Y);
  assert.equal(state.player.onGround, true);
  assert.equal(state.status, "playing");
});

test("a jump pressed just before landing still happens (buffer)", () => {
  const state = createObbyState(1);
  requestJump(state);
  steps(state, 36); // almost back on the ground
  requestJump(state);
  steps(state, 12);
  assert.equal(state.jumps, 2);
});

test("running into a gap without jumping fails as touching the floor", () => {
  const state = createObbyState(1);
  steps(state, 60 * 10);
  assert.equal(state.status, "failed");
  assert.equal(state.failure, "gap");
});

test("running into a hazard fails", () => {
  const state = createObbyState(2);
  const hazard = levelFor(2).hazards[0];
  state.player.x = hazard.x - 30;
  steps(state, 60);
  assert.equal(state.status, "failed");
  assert.equal(state.failure, "hazard");
});

test("reaching the end rolls into the next endless section", () => {
  const state = createObbyState(1);
  state.player.x = levelFor(1).length - 1;
  stepObby(state, FRAME);
  assert.equal(state.status, "playing");
  assert.equal(state.level, 2);
  assert.equal(state.player.x, 40);
});

test("restart puts the runner back at the start of the level", () => {
  const state = createObbyState(3);
  assert.equal(state.level, 3);
  assert.equal(state.player.x, 40);
  assert.equal(state.status, "playing");
  assert.equal(createObbyState(99).level, 99, "continuous sections keep advancing");
});

// A simple bot jumps a little before each edge or hazard. Every level must be
// finishable across a wide timing window and every moving-platform phase, so
// no level ever needs a pixel-perfect jump.
function botRun(levelNo: number, lead: number, phase: number) {
  const state = createObbyState(levelNo);
  state.time = phase;
  const level = levelFor(levelNo);
  let lastJumpX = -Infinity;
  for (let i = 0; i < 20_000 && state.status === "playing"; i += 1) {
    const { player } = state;
    if (player.onGround) {
      const surfaces = [
        ...level.ground.map((segment) => ({ x: segment.x, w: segment.w, y: GROUND_Y })),
        ...level.platforms.map((platform) => ({ x: platformX(platform, state.time), w: platform.w, y: platform.y })),
      ];
      const current = surfaces.find((surface) => surface.y === player.y && player.x + PLAYER_WIDTH / 2 > surface.x && player.x - PLAYER_WIDTH / 2 < surface.x + surface.w);
      const hazardAhead = player.y === GROUND_Y && level.hazards.some((hazard) => {
        if (hazard.air) return false;
        const distance = hazardX(hazard, player.x) - (player.x + PLAYER_WIDTH / 2);
        return distance > 0 && distance <= 30 + lead;
      });
      // Never jump into a floating obstacle: it sits where the jump arc passes.
      const airOverhead = level.hazards.some((hazard) => hazard.air && hazard.x + hazard.w > player.x - 20 && hazard.x < player.x + 130);
      const edgeDistance = current ? current.x + current.w - player.x : Infinity;
      if ((edgeDistance <= 14 + lead || (hazardAhead && !airOverhead)) && player.x - lastJumpX > 40) {
        requestJump(state);
        lastJumpX = player.x;
      }
    }
    stepObby(state, FRAME);
    if (state.level > levelNo) return "complete";
  }
  return state.status;
}

test("every level is finishable with a forgiving timing window", () => {
  for (let level = 1; level <= OBBY_LEVELS.length; level += 1) {
    for (const lead of [-10, 0, 10, 20]) {
      for (const phase of [0, 0.5, 1, 1.5, 2, 2.5]) {
        assert.equal(botRun(level, lead, phase), "complete", `level ${level}, lead ${lead}, phase ${phase}`);
      }
    }
  }
});

test("looped runs are faster and still finishable", () => {
  const loopLevel = OBBY_LEVELS.length * 2 + 1; // third time round, phase 1
  assert.ok(levelFor(loopLevel).speed > OBBY_LEVELS[0].speed);
  for (let level = OBBY_LEVELS.length + 1; level <= OBBY_LEVELS.length * 4; level += 1) {
    for (const lead of [-10, 0, 10, 20]) {
      assert.equal(botRun(level, lead, 1), "complete", `level ${level}, lead ${lead}`);
    }
  }
});

test("levels last roughly 20–45 seconds", () => {
  for (const level of OBBY_LEVELS) {
    const seconds = level.length / level.speed;
    assert.ok(seconds >= 20 && seconds <= 45, `${level.name}: ${seconds.toFixed(1)}s`);
  }
});

test("standing runs under a floating obstacle; jumping into it fails", () => {
  const level = levelFor(5);
  const air = level.hazards.find((hazard) => hazard.air)!;
  assert.ok(hazardBand(air).bottom < GROUND_Y - PLAYER_HEIGHT + 8);
  const under = createObbyState(5);
  under.player.x = air.x - 40;
  for (let i = 0; i < 60; i += 1) stepObby(under, FRAME);
  assert.equal(under.status, "playing");
  const into = createObbyState(5);
  into.player.x = air.x - 60;
  requestJump(into);
  for (let i = 0; i < 60 && into.status === "playing"; i += 1) stepObby(into, FRAME);
  assert.equal(into.failure, "hazard");
});

test("rolling obstacles move toward the runner and always meet it in the same place", () => {
  const roll = levelFor(4).hazards.find((hazard) => hazard.roll)!;
  assert.equal(hazardX(roll, roll.x - 400), roll.x);
  assert.ok(hazardX(roll, roll.x - 100) < roll.x);
});

test("a checkpoint restart puts the runner on safe ground at or before the checkpoint", () => {
  for (let levelNo = 1; levelNo <= OBBY_LEVELS.length; levelNo += 1) {
    const level = levelFor(levelNo);
    for (let checkpoint = 1; checkpoint * 500 < level.length; checkpoint += 1) {
      const state = createObbyState(levelNo);
      state.checkpoint = checkpoint;
      state.status = "failed";
      state.time = 12;
      const next = respawnAtCheckpoint(state);
      assert.equal(next.status, "playing");
      assert.ok(next.player.x <= checkpoint * 500);
      assert.equal(next.time, 12, "the clock keeps running");
      assert.ok(level.ground.some((segment) => next.player.x - 40 >= segment.x && next.player.x + 40 <= segment.x + segment.w) || next.player.x === 40);
      // And the run can be finished from there.
      let last = -Infinity;
      for (let i = 0; i < 20_000 && next.status === "playing"; i += 1) {
        const { player } = next;
        if (player.onGround) {
          const surfaces = [
            ...level.ground.map((segment) => ({ x: segment.x, w: segment.w, y: GROUND_Y })),
            ...level.platforms.map((platform) => ({ x: platformX(platform, next.time), w: platform.w, y: platform.y })),
          ];
          const current = surfaces.find((surface) => surface.y === player.y && player.x + PLAYER_WIDTH / 2 > surface.x && player.x - PLAYER_WIDTH / 2 < surface.x + surface.w);
          const ahead = level.hazards.some((hazard) => !hazard.air && hazardX(hazard, player.x) - (player.x + PLAYER_WIDTH / 2) > 0 && hazardX(hazard, player.x) - (player.x + PLAYER_WIDTH / 2) <= 30);
          const air = level.hazards.some((hazard) => hazard.air && hazard.x + hazard.w > player.x - 20 && hazard.x < player.x + 130);
          const edge = current ? current.x + current.w - player.x : Infinity;
          if ((edge <= 14 || (ahead && !air)) && player.x - last > 40) { requestJump(next); last = player.x; }
        }
        stepObby(next, FRAME);
        if (next.level > levelNo) break;
      }
      assert.ok(next.level > levelNo, `level ${levelNo} from checkpoint ${checkpoint}`);
    }
  }
});

