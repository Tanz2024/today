import test from "node:test";
import assert from "node:assert/strict";
import {
  BREAKER_HEIGHT, BREAKER_WIDTH, boardBehavior, createBreakerState, launchBall, layoutBoard, nextBoard, setPaddleX, stepBreaker,
  type BreakerState,
} from "../lib/play/breaker.ts";

function withBall(state: BreakerState, ball: Partial<BreakerState["ball"]>) {
  state.launched = true;
  Object.assign(state.ball, ball);
  return state;
}

test("paddle stays inside the field", () => {
  const state = createBreakerState();
  setPaddleX(state, -500);
  assert.equal(state.paddle.x, state.paddle.w / 2);
  setPaddleX(state, 5000);
  assert.equal(state.paddle.x, BREAKER_WIDTH - state.paddle.w / 2);
});

test("ball rides the paddle until launched, then launches upward once", () => {
  const state = createBreakerState();
  setPaddleX(state, 100);
  stepBreaker(state, 0.1);
  assert.equal(state.ball.x, 100);
  assert.equal(launchBall(state), true);
  assert.ok(state.ball.vy < 0);
  assert.equal(launchBall(state), false);
});

test("ball bounces off side and top walls", () => {
  const state = withBall(createBreakerState(), { x: 8, y: 300, vx: -200, vy: 0 });
  state.bricks = [{ x: 0, y: 0, w: 1, h: 1, hp: 1, maxHp: 1 }];
  stepBreaker(state, 0.05);
  assert.ok(state.ball.vx > 0, "left wall reflects");
  withBall(state, { x: BREAKER_WIDTH - 8, y: 300, vx: 200, vy: 0 });
  stepBreaker(state, 0.05);
  assert.ok(state.ball.vx < 0, "right wall reflects");
  withBall(state, { x: 180, y: 9, vx: 0, vy: -200 });
  stepBreaker(state, 0.05);
  assert.ok(state.ball.vy > 0, "top wall reflects");
});

test("paddle hit sends the ball up, angled by where it lands", () => {
  const state = createBreakerState();
  state.bricks = [{ x: 0, y: 0, w: 1, h: 1, hp: 1, maxHp: 1 }];
  withBall(state, { x: state.paddle.x + state.paddle.w / 2 - 2, y: state.paddle.y - 10, vx: 0, vy: 300 });
  const events = stepBreaker(state, 0.03);
  assert.equal(events.paddleHit, true);
  assert.ok(state.ball.vy < 0);
  assert.ok(state.ball.vx > 0, "right edge sends the ball right");
});

test("hitting a brick removes it, scores and reflects the ball", () => {
  const state = createBreakerState();
  state.bricks = [{ x: 150, y: 100, w: 60, h: 18, hp: 1, maxHp: 1 }, { x: 0, y: 0, w: 10, h: 10, hp: 1, maxHp: 1 }];
  withBall(state, { x: 180, y: 130, vx: 0, vy: -300 });
  const events = stepBreaker(state, 0.05);
  assert.equal(events.bricksBroken, 1);
  assert.equal(state.bricks.length, 1);
  assert.equal(state.score, 10);
  assert.ok(state.ball.vy > 0);
});

test("tough bricks take two hits", () => {
  const state = createBreakerState(3);
  const tough = state.bricks.find((brick) => brick.maxHp === 2);
  assert.ok(tough, "board 3 has two-hit bricks");
  state.bricks = [{ x: 150, y: 100, w: 60, h: 18, hp: 2, maxHp: 2 }, { x: 0, y: 0, w: 10, h: 10, hp: 1, maxHp: 1 }];
  withBall(state, { x: 180, y: 130, vx: 0, vy: -300 });
  stepBreaker(state, 0.05);
  assert.equal(state.bricks[0].hp, 1);
  assert.equal(state.bricks.length, 2);
});

test("losing one ball preserves the run and consumes an attempt", () => {
  const state = withBall(createBreakerState(), { x: 20, y: BREAKER_HEIGHT - 2, vx: 0, vy: 400 });
  stepBreaker(state, 0.1);
  assert.equal(state.status, "playing");
  assert.equal(state.lives, 2);
  assert.equal(state.launched, false);
});

test("clearing the last brick completes the board with a bonus", () => {
  const state = createBreakerState();
  state.bricks = [{ x: 150, y: 100, w: 60, h: 18, hp: 1, maxHp: 1 }];
  withBall(state, { x: 180, y: 130, vx: 0, vy: -300 });
  stepBreaker(state, 0.05);
  assert.equal(state.status, "cleared");
  assert.equal(state.score, 10 + 100);
  const next = nextBoard(state);
  assert.equal(next.board, 2);
  assert.equal(next.score, state.score);
  assert.equal(next.status, "playing");
});

test("restart gives a fresh first board", () => {
  const state = createBreakerState(1);
  assert.equal(state.score, 0);
  assert.equal(state.launched, false);
  assert.deepEqual(state.bricks, layoutBoard(1));
});

test("fast balls cannot tunnel through a brick", () => {
  const state = createBreakerState();
  state.bricks = [{ x: 100, y: 100, w: 160, h: 18, hp: 1, maxHp: 1 }, { x: 0, y: 0, w: 5, h: 5, hp: 1, maxHp: 1 }];
  withBall(state, { x: 180, y: 160, vx: 0, vy: -2000 });
  stepBreaker(state, 0.05);
  assert.equal(state.bricks.length, 1);
});

test("board progression uses distinct deterministic behaviors", () => {
  assert.equal(boardBehavior(1), "basic");
  assert.equal(boardBehavior(3), "channel");
  assert.equal(boardBehavior(4), "split");
  assert.equal(boardBehavior(5), "protected-core");
  assert.equal(boardBehavior(6), "moving-row");
  assert.notEqual(boardBehavior(7), boardBehavior(1));
  assert.deepEqual(layoutBoard(7), layoutBoard(7));
});

test("channel and split boards leave readable routes", () => {
  const channel = layoutBoard(3);
  assert.ok(!channel.some((brick) => brick.y > 48 && brick.x < 180 && brick.x + brick.w > 180));
  const split = layoutBoard(4);
  assert.ok(split.some((brick) => brick.x < 120));
  assert.ok(split.some((brick) => brick.x > 240));
  assert.ok(!split.some((brick) => brick.y > 48 && brick.x < 180 && brick.x + brick.w > 180));
});

test("protected core is tougher but remains accessible", () => {
  const bricks = layoutBoard(5);
  assert.ok(bricks.some((brick) => brick.maxHp >= 3));
  assert.ok(bricks.some((brick) => brick.maxHp === 1));
});

test("moving row stays bounded and changes deterministically", () => {
  const state = createBreakerState(6);
  const first = state.bricks.filter((brick) => brick.move);
  assert.equal(first.length, 7);
  const before = first[0].x;
  stepBreaker(state, 0.5);
  assert.notEqual(first[0].x, before);
  for (const brick of first) {
    assert.ok(brick.x >= brick.move!.baseX - brick.move!.range);
    assert.ok(brick.x <= brick.move!.baseX + brick.move!.range);
  }
});

test("the daily shift varies boards 2+ but keeps board 1 as the warm-up", () => {
  assert.equal(boardBehavior(1, 17), "basic");
  const orders = new Set([0, 1, 2, 3].map((shift) => [2, 3, 4, 5].map((board) => boardBehavior(board, shift)).join(",")));
  assert.equal(orders.size, 4);
  assert.notDeepEqual(layoutBoard(1, 1).map((brick) => !!brick.pickup), layoutBoard(1, 0).map((brick) => !!brick.pickup));
  const state = createBreakerState(1, 0, 5);
  assert.equal(nextBoard(state).dayShift, 5);
});
