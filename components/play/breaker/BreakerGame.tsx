"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GameShell, { type GamePhase } from "@/components/play/GameShell";
import GameResult from "@/components/play/GameResult";
import PlayNext from "@/components/play/PlayNext";
import { prefersReducedMotion, useGameCanvas } from "@/components/play/useGameCanvas";
import { fillRoundedRect as drawRoundedRect } from "@/components/play/canvas";
import {
  BREAKER_HEIGHT, BREAKER_WIDTH, boardName, boardBehavior, createBreakerState, launchBall, nextBoard, setPaddleX, stepBreaker, type BreakerState,
} from "@/lib/play/breaker";
import { createPlaySession, scoreBucket } from "@/lib/play/analytics";
import { breakerResultCopy } from "@/lib/play/result-copy";
import { dailyShift, recordDailyResult } from "@/lib/play/daily";
import { readGameStats, recordGameResult, recordLevelReached, type GameStats } from "@/lib/play/storage";
import type { PlayCandidate } from "@/lib/play/candidates";

const KEYBOARD_PADDLE_SPEED = 460;
const TAP_MOVEMENT_PX = 10;
const COLORS = {
  background: "#0B1020",
  field: "#111827",
  hud: "#F8FAFC",
  muted: "#94A3B8",
  ball: "#FFFFFF",
  paddle: "#E5E7EB",
  accent: "#6D5DFB",
  combo: "#FFD166",
  normal: "#4F7CFF",
  strong: "#A855F7",
  tactical: "#22D3EE",
  core: "#FF6B6B",
  moving: "#F59E0B",
  warmCoral: "#F26B5B",
  warmAmber: "#F3B64C",
  cream: "#F5E9D4",
};

type Outcome = {
  kind: "lost" | "cleared"; score: number; board: number; isNewBest: boolean; previousBest: number;
  daily: { hit: boolean; remaining: string; label: string };
};

function formatScore(score: number) {
  return score.toLocaleString("en-US");
}


export default function BreakerGame({ candidates }: { candidates: PlayCandidate[] }) {
  const [session] = useState(() => createPlaySession("breaker"));
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [stats, setStats] = useState<GameStats | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const stateRef = useRef<BreakerState>(createBreakerState());
  const phaseRef = useRef<GamePhase>("ready");
  const scoreRef = useRef<HTMLSpanElement | null>(null);
  const shownScore = useRef(-1);
  const keys = useRef({ left: false, right: false });
  const drag = useRef<{ id: number; startX: number; paddleX: number; moved: number } | null>(null);
  // Score at the start of the current board, so each board's points are banked once.
  const hitFlash = useRef(0);
  const comboPulse = useRef(0);
  const clearPulse = useRef(0);
  const impact = useRef<{ x: number; y: number; age: number } | null>(null);
  const reducedMotion = useRef(false);
  const audioContext = useRef<AudioContext | null>(null);

  const playTone = useCallback((frequency: number, duration: number, volume = 0.025) => {
    if (typeof window === "undefined" || reducedMotion.current) return;
    try { if (window.localStorage.getItem("brisastory:play:sound") === "off") return; } catch { /* optional */ }
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      const audio = audioContext.current ?? (audioContext.current = new AudioCtor());
      if (audio.state === "suspended") void audio.resume();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    } catch { /* sound is optional */ }
  }, []);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    session.impression();
    reducedMotion.current = prefersReducedMotion();
    try { queueMicrotask(() => setStats(readGameStats(window.localStorage, "breaker"))); } catch { /* optional */ }
  }, [session]);

  const syncScore = useCallback(() => {
    const score = stateRef.current.score;
    if (score !== shownScore.current && scoreRef.current) {
      shownScore.current = score;
      scoreRef.current.textContent = formatScore(score);
    }
  }, []);

  const finish = useCallback((kind: Outcome["kind"]) => {
    const state = stateRef.current;
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* optional */ }
    const previousBest = readGameStats(storage, "breaker").bestScore;
    let isNewBest = false;
    if (kind === "lost") {
      const recorded = recordGameResult(storage, "breaker", { score: state.score, level: state.board, count: state.bestCombo });
      // A first-ever run has nothing to beat, so it is not called a "new best".
      isNewBest = recorded.isNewBest && previousBest > 0;
      setStats(recorded.stats);
      session.fail({ score_bucket: scoreBucket(state.score), level: state.board });
      setAnnouncement(`Game over. Score ${formatScore(state.score)} on board ${state.board}.`);
    } else {
      session.boardClear(state.board);
      setStats(recordLevelReached(storage, "breaker", state.board));
      session.complete({ score_bucket: scoreBucket(state.score), level: state.board });
      setAnnouncement(`${boardName(state.board)} cleared. Score ${formatScore(state.score)}.`);
    }
    const today = recordDailyResult(storage, "breaker", state.score);
    const daily = { hit: today.hit, remaining: formatScore(today.remaining), label: today.target.label };
    setOutcome({ kind, score: state.score, board: state.board, isNewBest, previousBest, daily });
    setPhase("result");
  }, [session]);

  const onFrame = useCallback((dt: number) => {
    const state = stateRef.current;
    const direction = Number(keys.current.right) - Number(keys.current.left);
    if (direction !== 0) {
      setPaddleX(state, state.paddle.x + direction * KEYBOARD_PADDLE_SPEED * dt);
      session.firstAction();
    }
    const events = stepBreaker(state, dt);
    if (events.bricksBroken > 0) {
      hitFlash.current = 0.08;
      impact.current = { x: state.ball.x, y: state.ball.y, age: 0 };
      playTone(state.combo >= 3 ? 620 : 440, 0.06);
    }
    if (state.combo >= 2 && events.bricksBroken > 0) comboPulse.current = 0.22;
    comboPulse.current = Math.max(0, comboPulse.current - dt);
    clearPulse.current = Math.max(0, clearPulse.current - dt);
    if (state.status === "cleared") clearPulse.current = 0.35;
    hitFlash.current = Math.max(0, hitFlash.current - dt);
    if (impact.current) {
      impact.current.age += dt;
      if (impact.current.age > 0.18) impact.current = null;
    }
    syncScore();
    // Finish exactly once, even if another frame runs before React stops the loop.
    if (state.status !== "playing" && phaseRef.current === "playing") {
      phaseRef.current = "result";
      finish(state.status);
    }
  }, [finish, playTone, session, syncScore]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = stateRef.current;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, BREAKER_WIDTH, BREAKER_HEIGHT);
    const fieldGradient = ctx.createLinearGradient(0, 8, 0, BREAKER_HEIGHT - 8);
    fieldGradient.addColorStop(0, "#17213A");
    fieldGradient.addColorStop(0.5, COLORS.field);
    fieldGradient.addColorStop(1, "#0F172A");
    ctx.fillStyle = fieldGradient;
    drawRoundedRect(ctx, 8, 8, BREAKER_WIDTH - 16, BREAKER_HEIGHT - 16, 10);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(8, 8, BREAKER_WIDTH - 16, BREAKER_HEIGHT - 16, 10);
    ctx.clip();
    ctx.strokeStyle = "rgba(148,163,184,0.045)";
    ctx.lineWidth = 1;
    for (let y = 72; y < BREAKER_HEIGHT; y += 32) {
      ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(BREAKER_WIDTH - 8, y); ctx.stroke();
    }
    ctx.restore();

    // The first 40px are a dedicated HUD band; bricks begin below it.
    ctx.fillStyle = COLORS.muted;
    ctx.font = "700 9px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${boardName(state.board).toUpperCase()} · ${boardBehavior(state.board, state.dayShift).replaceAll("-", " ").toUpperCase()}`, 18, 23);
    ctx.fillStyle = COLORS.hud;
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.fillText(`SCORE ${state.score.toLocaleString("en-US")}`, 18, 36);
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.muted;
    ctx.font = "700 9px system-ui, sans-serif";
    ctx.fillText(`BEST ${stats?.bestScore.toLocaleString("en-US") ?? "0"}`, BREAKER_WIDTH - 18, 23);
    // Compact Mario-style hearts drawn in-canvas so font emoji metrics can
    // never push the life indicator outside the playfield.
    const drawHeart = (x: number, y: number, filled: boolean) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.bezierCurveTo(-8, -3, -6, -9, -2.5, -9);
      ctx.bezierCurveTo(0, -9, 1.5, -6.5, 2, -5.5);
      ctx.bezierCurveTo(2.5, -6.5, 4, -9, 6.5, -9);
      ctx.bezierCurveTo(10, -9, 12, -3, 4, 3);
      ctx.lineTo(2, 5);
      ctx.closePath();
      ctx.fillStyle = filled ? "#FF4D6D" : "#334155";
      ctx.fill();
      ctx.strokeStyle = filled ? "#FFB3C1" : "#64748B";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    };
    const heartCount = 3;
    for (let index = 0; index < heartCount; index += 1) {
      drawHeart(BREAKER_WIDTH - 24 - (heartCount - 1 - index) * 18, 40, index < state.lives);
    }
    if (state.combo >= 2) {
      ctx.fillStyle = COLORS.combo;
      const pulse = !reducedMotion.current && comboPulse.current > 0 ? 1 + comboPulse.current * 1.8 : 1;
      ctx.save();
      ctx.translate(BREAKER_WIDTH - 18, 50);
      ctx.scale(pulse, pulse);
      ctx.font = "800 12px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`×${state.combo} COMBO`, 0, 0);
      ctx.restore();
    }

    for (const brick of state.bricks) {
      const row = Math.round((brick.y - 48) / 24);
      const isCore = brick.maxHp >= 3;
      const isStrong = brick.maxHp === 2;
      const isMoving = Boolean(brick.move);
      const isTactical = boardBehavior(state.board, state.dayShift) === "channel" || (state.board === 1 && row === 0);
      // Board 1 is the familiar entry board: simple, symmetrical, and
      // colorful. Later boards keep their semantic colors for mechanics.
      const classicBand = [COLORS.warmCoral, COLORS.warmAmber, COLORS.tactical, COLORS.normal][Math.min(row, 3)];
      ctx.fillStyle = state.board === 1
        ? classicBand
        : isCore ? COLORS.core : isMoving ? COLORS.moving : isStrong ? COLORS.strong : isTactical ? COLORS.tactical : COLORS.normal;
      drawRoundedRect(ctx, brick.x, brick.y, brick.w, brick.h, 3);
      ctx.strokeStyle = "rgba(245,233,212,0.38)";
      ctx.lineWidth = 1;
      ctx.strokeRect(brick.x + 0.5, brick.y + 0.5, brick.w - 1, brick.h - 1);
      ctx.fillStyle = "rgba(245,233,212,0.24)";
      ctx.fillRect(brick.x + 2, brick.y + 2, brick.w - 4, 2);
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(brick.x + 2, brick.y + brick.h - 3, brick.w - 4, 1);
      if (brick.move) {
        ctx.strokeStyle = COLORS.moving;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(brick.x + 8, brick.y - 3);
        ctx.lineTo(brick.x + brick.w - 8, brick.y - 3);
        ctx.stroke();
      }
      if (brick.maxHp > 1) {
        // Tough bricks are marked by shape, not only colour: an inner bar,
        // which turns into a crack once they have been hit.
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (brick.hp > 1) {
          ctx.moveTo(brick.x + 6, brick.y + brick.h / 2);
          ctx.lineTo(brick.x + brick.w - 6, brick.y + brick.h / 2);
        } else {
          ctx.moveTo(brick.x + brick.w * 0.3, brick.y + 3);
          ctx.lineTo(brick.x + brick.w * 0.5, brick.y + brick.h - 4);
          ctx.lineTo(brick.x + brick.w * 0.66, brick.y + 5);
        }
        ctx.stroke();
      }
      if (brick.pickup) {
        ctx.strokeStyle = COLORS.hud;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(brick.x + brick.w / 2 - 3, brick.y + brick.h / 2 - 3, 6, 6);
      }
    }

    for (const drop of state.drops) {
      ctx.fillStyle = COLORS.accent;
      ctx.beginPath(); ctx.arc(drop.x, drop.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.hud;
      ctx.fillRect(drop.x - 4, drop.y - 1, 8, 2);
      ctx.fillRect(drop.x - 1, drop.y - 4, 2, 8);
    }

    if (impact.current && !reducedMotion.current) {
      const progress = impact.current.age / 0.18;
      ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.7 - progress)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(impact.current.x, impact.current.y, 7 + progress * 13, 0, Math.PI * 2);
      ctx.stroke();
    }

    const { paddle, ball } = state;
    ctx.fillStyle = COLORS.paddle;
    drawRoundedRect(ctx, paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h, 6);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    drawRoundedRect(ctx, paddle.x - paddle.w / 2 + 5, paddle.y + 2, paddle.w - 10, 2, 1);
    ctx.fillStyle = COLORS.accent;
    drawRoundedRect(ctx, paddle.x - 10, paddle.y + 3, 20, 6, 3);
    ctx.fillStyle = COLORS.ball;
    ctx.shadowColor = "rgba(255,255,255,0.55)";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (hitFlash.current > 0 && !reducedMotion.current) {
      ctx.fillStyle = "rgba(79,124,255,0.10)";
      ctx.fillRect(0, 0, BREAKER_WIDTH, BREAKER_HEIGHT);
    }
    if (clearPulse.current > 0 && !reducedMotion.current) {
      ctx.fillStyle = `rgba(109,93,251,${Math.min(0.2, clearPulse.current * 0.5)})`;
      ctx.fillRect(0, 0, BREAKER_WIDTH, BREAKER_HEIGHT);
      ctx.fillStyle = COLORS.hud;
      ctx.font = "800 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BOARD CLEAR", BREAKER_WIDTH / 2, BREAKER_HEIGHT / 2 - 8);
      ctx.fillStyle = COLORS.combo;
      ctx.font = "700 10px system-ui, sans-serif";
      ctx.fillText(`${boardName(state.board)} complete`, BREAKER_WIDTH / 2, BREAKER_HEIGHT / 2 + 12);
    }

    if (!state.launched && phaseRef.current === "playing") {
      ctx.fillStyle = COLORS.muted;
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TAP / SPACE TO LAUNCH", BREAKER_WIDTH / 2, paddle.y - 40);
    }
  }, [stats]);

  const { canvasRef, toGamePoint } = useGameCanvas({ width: BREAKER_WIDTH, height: BREAKER_HEIGHT, running: phase === "playing", onFrame, draw });

  const begin = useCallback((state: BreakerState) => {
    stateRef.current = state;
    shownScore.current = -1;
    syncScore();
    setOutcome(null);
    setAnnouncement(`Board ${state.board}, ${boardName(state.board)}. Tap or press Space to launch.`);
    session.start();
    setPhase("playing");
  }, [session, syncScore]);

  const start = useCallback(() => begin(createBreakerState(1, 0, dailyShift("breaker"))), [begin]);
  const replay = useCallback(() => { session.replay(); begin(createBreakerState(1, 0, dailyShift("breaker"))); }, [begin, session]);
  const continueToNextBoard = useCallback(() => begin(nextBoard(stateRef.current)), [begin]);
  const pause = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    keys.current = { left: false, right: false };
    session.pause();
    setAnnouncement("Paused.");
    setPhase("paused");
  }, [session]);
  const resume = useCallback(() => { session.resume(); setAnnouncement(""); setPhase("playing"); }, [session]);

  // Keyboard: held arrows move the paddle; Space or ArrowUp launches.
  useEffect(() => {
    if (phase !== "playing") return;
    const down = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") { keys.current.left = true; event.preventDefault(); }
      else if (event.key === "ArrowRight") { keys.current.right = true; event.preventDefault(); }
      else if (event.key === " " || event.key === "ArrowUp") {
        event.preventDefault();
        if (launchBall(stateRef.current)) session.firstAction();
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") keys.current.left = false;
      if (event.key === "ArrowRight") keys.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); keys.current = { left: false, right: false }; };
  }, [phase, session]);

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "playing") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, startX: toGamePoint(event.clientX, event.clientY).x, paddleX: stateRef.current.paddle.x, moved: 0 };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "playing") return;
    const point = toGamePoint(event.clientX, event.clientY);
    const active = drag.current;
    if (active && active.id === event.pointerId) {
      // Touch/drag is relative, so a thumb never has to cover the paddle.
      const delta = point.x - active.startX;
      active.moved = Math.max(active.moved, Math.abs(delta));
      setPaddleX(stateRef.current, active.paddleX + delta);
      if (active.moved > TAP_MOVEMENT_PX) session.firstAction();
    } else if (event.pointerType === "mouse") {
      setPaddleX(stateRef.current, point.x);
      session.firstAction();
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    drag.current = null;
    if (!active || active.id !== event.pointerId || phaseRef.current !== "playing") return;
    if (active.moved <= TAP_MOVEMENT_PX && launchBall(stateRef.current)) session.firstAction();
  };

  const best = stats && stats.bestScore > 0 ? `Best ${formatScore(stats.bestScore)} · Board ${Math.max(1, stats.highestLevel)}` : null;

  return (
    <GameShell
      title="TodayAI Breaker"
      theme="midnight"
      challenge="Clear one more board"
      game="breaker"
      after={<PlayNext game="breaker" candidates={candidates} session={session} collected={{}} />}
      touchHint="Drag to move · tap to launch"
      mobileInstructions={["Drag the paddle left or right", "Tap the stage to launch the ball", "Catch falling story tokens for bonus points"]}
      tagline="Move the paddle. Break the bricks."
      controls="Move the paddle. Break the bricks. Tap or Space to launch."
      phase={phase}
      width={BREAKER_WIDTH}
      height={BREAKER_HEIGHT}
      scoreLabel="Score"
      scoreRef={scoreRef}
      best={best}
      startLabel="Play"
      onStart={start}
      onPause={pause}
      onResume={resume}
      onRestart={replay}
      announcement={announcement}
      result={outcome && (
        <GameResult
          variant="breaker"
          copy={breakerResultCopy({ score: outcome.score, board: outcome.board, previousBest: outcome.previousBest, isNewBest: outcome.isNewBest, cleared: outcome.kind === "cleared" })}
          primary={outcome.kind === "lost" ? { label: "Again", onClick: replay } : { label: "Next board", onClick: continueToNextBoard }}
          secondary={outcome.kind === "cleared" ? { label: "Start over", onClick: replay } : undefined}
          daily={outcome.daily}
          session={session}
          share={{ game: "TodayAI Breaker", path: "/play/breaker" }}
        />
      )}
    >
      <canvas
        ref={canvasRef}
        aria-label="TodayAI Breaker game area"
        role="img"
        className="absolute inset-0 h-full w-full select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { drag.current = null; }}
      />
    </GameShell>
  );
}
