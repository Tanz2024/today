
// Brisa Breaker — pure game logic (no DOM). Coordinates are a fixed
// 360×480 portrait field; the canvas scales it to the screen.

export const BREAKER_WIDTH = 360;
export const BREAKER_HEIGHT = 480;

const PADDLE_Y = BREAKER_HEIGHT - 58;
const PADDLE_HEIGHT = 12;
const BALL_RADIUS = 7;
const MAX_BOUNCE_ANGLE = (60 * Math.PI) / 180;
const MIN_HORIZONTAL_SPEED = 72;
const SUBSTEP_PX = 4;
export const MAX_COMBO = 5;
export const TOKEN_POINTS = 50;
const DROP_SPEED = 150;
const DROP_RADIUS = 11;

// Boards are named after BrisaStory desks; the last name repeats.
export const BOARD_NAMES = ["Board 1", "Board 2", "Board 3", "Board 4", "Board 5", "Board 6", "Board 7", "Board 8", "Board 9"];
export type BreakerBehavior = "basic" | "geometry" | "channel" | "split" | "protected-core" | "moving-row" | "zigzag";
const BEHAVIOR_SEQUENCE: BreakerBehavior[] = ["basic", "geometry", "channel", "split", "protected-core", "moving-row", "zigzag", "channel", "split", "protected-core", "moving-row"];

export function boardName(board: number) { return `Board ${Math.max(1, Math.floor(board))}`; }
// `dayShift` rotates the board order (board 1 always stays the basic warm-up)
// and moves the hidden story bricks, so each day plays differently while
// staying the same for everyone. 0 gives the original order.
export function boardBehavior(board: number, dayShift = 0): BreakerBehavior {
  const index = Math.max(0, Math.floor(board) - 1);
  if (index === 0) return BEHAVIOR_SEQUENCE[0];
  const rest = BEHAVIOR_SEQUENCE.length - 1;
  return BEHAVIOR_SEQUENCE[1 + ((index - 1 + Math.max(0, Math.floor(dayShift))) % rest)];
}

export type Brick = { x: number; y: number; w: number; h: number; hp: number; maxHp: number; pickup?: boolean; move?: { baseX: number; range: number; phase: number } };
export type Drop = { x: number; y: number };

export type BreakerState = {
  board: number;
  dayShift: number;
  score: number;
  speed: number;
  paddle: { x: number; y: number; w: number; h: number };
  ball: { x: number; y: number; vx: number; vy: number; r: number };
  launched: boolean;
  lives: number;
  bricks: Brick[];
  drops: Drop[];
  combo: number;
  bestCombo: number;
  collected: Record<string, never>;
  status: "playing" | "lost" | "cleared";
  time: number;
};

export type BreakerEvents = { bricksBroken: number; paddleHit: boolean; caught: number };

export function boardSpeed(board: number) {
  return Math.min(420, 280 + (board - 1) * 22);
}

export function paddleWidth(board: number) {
  return Math.max(70, 96 - (board - 1) * 5);
}

// Deterministic layouts: a full wall, then shapes, with two-hit bricks
// appearing from board 3. Every board is always clearable.
export function layoutBoard(board: number, dayShift = 0): Brick[] {
  const cols = 7;
  const rows = Math.min(7, 3 + board);
  const margin = 18;
  const gap = 6;
  const top = 48;
  const h = 18;
  const w = (BREAKER_WIDTH - margin * 2 - gap * (cols - 1)) / cols;
  const behavior = boardBehavior(board, dayShift);
  const bricks: Brick[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (behavior === "geometry" && Math.abs(col - 3) > row + 1) continue;
      if (behavior === "channel" && row > 0 && col === 3) continue;
      if (behavior === "split" && row > 0 && col >= 2 && col <= 4) continue;
      // A checkerboard/zig-zag wall creates alternating sightlines without
      // removing the first row, so the opening remains readable on phones.
      if (behavior === "zigzag" && row > 0 && (col + row) % 3 === 1) continue;
      const tough = board >= 3 && row < 2;
      const protectedCore = behavior === "protected-core" && row >= 1 && row <= 2 && col >= 2 && col <= 4;
      const hp = protectedCore ? 3 : tough ? 2 : 1;
      const index = bricks.length;
      // Every sixth brick hides a story token that drops when it breaks.
      const pickup = (index + dayShift) % 6 === 3;
      const x = margin + col * (w + gap);
      bricks.push({ x, y: top + row * (h + gap), w, h, hp, maxHp: hp, ...(pickup ? { pickup: true } : {}), ...(behavior === "moving-row" && row === 0 ? { move: { baseX: x, range: 12, phase: 0 } } : {}) });
    }
  }
  return bricks;
}

export function createBreakerState(board = 1, score = 0, dayShift = 0): BreakerState {
  const w = paddleWidth(board);
  const state: BreakerState = {
    board,
    dayShift,
    score,
    speed: boardSpeed(board),
    paddle: { x: BREAKER_WIDTH / 2, y: PADDLE_Y, w, h: PADDLE_HEIGHT },
    ball: { x: BREAKER_WIDTH / 2, y: PADDLE_Y - BALL_RADIUS - 1, vx: 0, vy: 0, r: BALL_RADIUS },
    launched: false,
    lives: 3,
    bricks: layoutBoard(board, dayShift),
    drops: [],
    combo: 0,
    bestCombo: 0,
    collected: {},
    status: "playing",
    time: 0,
  };
  return state;
}

export function setPaddleX(state: BreakerState, x: number) {
  const half = state.paddle.w / 2;
  state.paddle.x = Math.min(BREAKER_WIDTH - half, Math.max(half, x));
  if (!state.launched) state.ball.x = state.paddle.x;
}

export function launchBall(state: BreakerState) {
  if (state.launched || state.status !== "playing") return false;
  state.launched = true;
  // A slight angle so the first shot never bounces straight up and down.
  const angle = (-18 * Math.PI) / 180;
  state.ball.vx = state.speed * Math.sin(angle);
  state.ball.vy = -state.speed * Math.cos(angle);
  return true;
}

function bounceOffPaddle(state: BreakerState) {
  const { ball, paddle } = state;
  const offset = Math.max(-1, Math.min(1, (ball.x - paddle.x) / (paddle.w / 2)));
  const angle = offset * MAX_BOUNCE_ANGLE;
  let vx = state.speed * Math.sin(angle);
  if (Math.abs(vx) < MIN_HORIZONTAL_SPEED) vx = (vx < 0 ? -1 : 1) * MIN_HORIZONTAL_SPEED;
  ball.vx = Math.max(-state.speed * Math.sin(MAX_BOUNCE_ANGLE), Math.min(state.speed * Math.sin(MAX_BOUNCE_ANGLE), vx));
  ball.vy = -state.speed * Math.cos(angle);
  ball.y = paddle.y - ball.r;
  state.combo = 0;
}

// Falling story tokens: caught by a generous paddle, otherwise they drop away.
function stepDrops(state: BreakerState, dt: number, events: BreakerEvents) {
  const { paddle } = state;
  const remaining: Drop[] = [];
  for (const drop of state.drops) {
    drop.y += DROP_SPEED * dt;
    const caught = drop.y + DROP_RADIUS >= paddle.y && drop.y - DROP_RADIUS <= paddle.y + paddle.h + 6
      && drop.x >= paddle.x - paddle.w / 2 - DROP_RADIUS && drop.x <= paddle.x + paddle.w / 2 + DROP_RADIUS;
    if (caught) {
      state.score += TOKEN_POINTS * state.board;
      events.caught += 1;
    } else if (drop.y - DROP_RADIUS <= BREAKER_HEIGHT) {
      remaining.push(drop);
    }
  }
  state.drops = remaining;
}

function hitBrick(state: BreakerState): Brick | null {
  const { ball } = state;
  for (const brick of state.bricks) {
    const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.w));
    const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.h));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    if (dx * dx + dy * dy > ball.r * ball.r) continue;
    // Reflect on the axis with the smaller overlap, then push the ball out.
    const overlapX = Math.min(ball.x + ball.r - brick.x, brick.x + brick.w - (ball.x - ball.r));
    const overlapY = Math.min(ball.y + ball.r - brick.y, brick.y + brick.h - (ball.y - ball.r));
    if (overlapX < overlapY) {
      ball.vx = ball.x < brick.x + brick.w / 2 ? -Math.abs(ball.vx) : Math.abs(ball.vx);
      ball.x += ball.vx > 0 ? overlapX : -overlapX;
    } else {
      ball.vy = ball.y < brick.y + brick.h / 2 ? -Math.abs(ball.vy) : Math.abs(ball.vy);
      ball.y += ball.vy > 0 ? overlapY : -overlapY;
    }
    return brick;
  }
  return null;
}

export function stepBreaker(state: BreakerState, dt: number): BreakerEvents {
  const events: BreakerEvents = { bricksBroken: 0, paddleHit: false, caught: 0 };
  if (state.status !== "playing") return events;
  state.time += dt;
  for (const brick of state.bricks) {
    if (brick.move) brick.x = brick.move.baseX + Math.sin(state.time * 1.4 + brick.move.phase) * brick.move.range;
  }
  if (!state.launched) {
    state.ball.x = state.paddle.x;
    state.ball.y = state.paddle.y - state.ball.r - 1;
    return events;
  }
  stepDrops(state, dt, events);
  const { ball, paddle } = state;
  const steps = Math.max(1, Math.ceil((state.speed * dt) / SUBSTEP_PX));
  const stepDt = dt / steps;
  for (let i = 0; i < steps; i += 1) {
    // With every brick gone the ball parks, so it can't be lost on an empty board.
    if (state.bricks.length === 0) break;
    ball.x += ball.vx * stepDt;
    ball.y += ball.vy * stepDt;

    if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
    if (ball.x > BREAKER_WIDTH - ball.r) { ball.x = BREAKER_WIDTH - ball.r; ball.vx = -Math.abs(ball.vx); }
    if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }

    // Generous paddle: the ball's full radius counts on both ends.
    const withinPaddle = ball.x >= paddle.x - paddle.w / 2 - ball.r && ball.x <= paddle.x + paddle.w / 2 + ball.r;
    if (ball.vy > 0 && withinPaddle && ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h) {
      bounceOffPaddle(state);
      events.paddleHit = true;
    }

    const brick = hitBrick(state);
    if (brick) {
      brick.hp -= 1;
      if (brick.hp <= 0) {
        state.bricks = state.bricks.filter((item) => item !== brick);
        // Bricks broken before the ball returns to the paddle chain a combo.
        state.combo = Math.min(MAX_COMBO, state.combo + 1);
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        state.score += 10 * state.board * state.combo;
        events.bricksBroken += 1;
        if (brick.pickup) state.drops.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2 });
      } else {
        state.score += 5;
      }
    }

    if (ball.y - ball.r > BREAKER_HEIGHT) {
      state.lives -= 1;
      if (state.lives <= 0) state.status = "lost";
      else {
        state.launched = false;
        state.ball.x = state.paddle.x;
        state.ball.y = state.paddle.y - state.ball.r - 1;
        state.ball.vx = 0;
        state.ball.vy = 0;
        state.combo = 0;
      }
      return events;
    }
  }
  // The board clears once the last brick is gone and any falling token has
  // been caught or missed, so a token is never lost to the transition.
  if (state.bricks.length === 0 && state.drops.length === 0) {
    state.score += 100 * state.board;
    state.status = "cleared";
  }
  return events;
}

export function nextBoard(state: BreakerState): BreakerState {
  return createBreakerState(state.board + 1, state.score, state.dayShift);
}
