"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GameShell, { type GamePhase } from "@/components/play/GameShell";
import GameResult from "@/components/play/GameResult";
import PlayNext from "@/components/play/PlayNext";
import { dailyShift, recordDailyResult } from "@/lib/play/daily";
import { fillRoundedRect } from "@/components/play/canvas";
import { prefersReducedMotion, useGameCanvas } from "@/components/play/useGameCanvas";
import {
  GROUND_Y, OBBY_HEIGHT, OBBY_WIDTH, PLAYER_HEIGHT, PLAYER_WIDTH,
  cameraX, createObbyState, hazardBand, hazardX, levelFor, levelProgress, obbyLevelScore, platformX, requestJump, stepObby, tokensFor, type ObbyState,
} from "@/lib/play/obby";
import { createPlaySession, scoreBucket } from "@/lib/play/analytics";
import { obbyResultCopy } from "@/lib/play/result-copy";
import type { ThemeId } from "@/lib/play/themes";
import {
  readGameStats, recordGameResult, recordLevelBest, recordLevelReached, type GameStats,
} from "@/lib/play/storage";
import type { PlayCandidate } from "@/lib/play/candidates";
import { createGameFeedback } from "@/lib/play/feedback";

const FLOOR_TOP = 452;
const WORLD_ZOOM = 1.12;
// Phases that first introduce each new obstacle (they show a one-line hint).
const ROLL_INTRO_LEVEL = 3;
const AIR_INTRO_LEVEL = 2;
const OBBY_COLORS = {
  wall: "#F1E4CF",
  floor: "#C9A97E",
  wood: "#B98252",
  metal: "#5D6670",
  ink: "#23272F",
  inkSoft: "#667085",
  blue: "#3F6FF2",
  hazard: "#D85A55",
  green: "#4D8B68",
  yellow: "#E6B84E",
  sky: "#8FB9D9",
  cream: "#FFF4DF",
};

// Daily look: the course is hand-built (every jump is tested), so only the
// scenery changes day to day — wall and floor colours and the door signs.
const OBBY_LOOKS = [
  { wall: "#F1E4CF", floor: "#C9A97E", signs: ["AURA +100", "LOCK IN"] },
  { wall: "#E3ECF3", floor: "#B7C3CF", signs: ["NO CAP", "SLAY"] },
  { wall: "#EFE3F1", floor: "#C8B2C9", signs: ["6 7", "MAIN CHAR"] },
  { wall: "#E4EFE2", floor: "#A9C09F", signs: ["W RIZZ", "GYM"] },
  { wall: "#F5E6DA", floor: "#D2A88E", signs: ["IT'S GIVING", "EXAMS"] },
  { wall: "#E9E6F7", floor: "#B4AED6", signs: ["VIBE CHECK", "BAND"] },
  { wall: "#F4EFD6", floor: "#CDBE87", signs: ["SNACK TIME", "MENU"] },
]
let obbyLook = OBBY_LOOKS[0];

// Brisa, the runner: round head with a hair tuft, hoodie, backpack with a
// charm, and legs that swing while running.
function drawObbyPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, airborne: boolean, time: number) {
  ctx.save();
  ctx.fillStyle = "rgba(28,36,48,0.16)";
  ctx.beginPath(); ctx.ellipse(x + w / 2, GROUND_Y + 7, w * (airborne ? 0.32 : 0.45), 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = OBBY_COLORS.ink; ctx.lineWidth = 1.5;
  // Legs: a two-frame run cycle on the ground, tucked in the air.
  const swing = airborne ? 0 : Math.sin(time * 18) * 3;
  ctx.fillStyle = OBBY_COLORS.ink;
  ctx.fillRect(x + 6 + swing, y + h - 5, 5, 5);
  ctx.fillRect(x + w - 11 - swing, y + h - 5, 5, 5);
  // Backpack and charm.
  ctx.fillStyle = "#4D8B68"; fillRoundedRect(ctx, x, y + 12, 7, 11, 3);
  ctx.fillStyle = "#FF8FB1"; ctx.beginPath(); ctx.arc(x + 2, y + 24, 2, 0, Math.PI * 2); ctx.fill();
  // Hoodie.
  ctx.fillStyle = OBBY_COLORS.blue; fillRoundedRect(ctx, x + 4, y + 11, w - 8, h - 15, 5);
  ctx.strokeStyle = OBBY_COLORS.ink; ctx.strokeRect(x + 4.5, y + 11.5, w - 9, h - 16);
  ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(x + w / 2 - 1, y + 13, 2, 6);
  // Head, hair and face.
  const hx = x + w * 0.55; const hy = y + 6;
  ctx.fillStyle = "#F0B58D"; ctx.beginPath(); ctx.arc(hx, hy, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#493A35"; ctx.beginPath(); ctx.arc(hx, hy - 1, 6.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx - 1, hy - 7); ctx.quadraticCurveTo(hx + 2, hy - 12, hx + 4, hy - 7); ctx.fill();
  ctx.fillStyle = OBBY_COLORS.ink; ctx.beginPath(); ctx.arc(hx + 2.5, hy + 0.5, 1.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FF8FB1"; ctx.beginPath(); ctx.arc(hx + 3.5, hy + 3, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Floating obstacle: a paper plane at head height. Standing runs under it.
function drawPaperPlane(ctx: CanvasRenderingContext2D, x: number, top: number, w: number, h: number, time: number) {
  ctx.save();
  const bob = Math.sin(time * 5) * 1.5;
  ctx.translate(0, bob);
  ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = OBBY_COLORS.ink; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, top + h / 2); ctx.lineTo(x + w + 6, top); ctx.lineTo(x + w - 2, top + h); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#C9D7FF"; ctx.beginPath(); ctx.moveTo(x, top + h / 2); ctx.lineTo(x + w - 2, top + h); ctx.lineTo(x + w - 8, top + h / 2 + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Speed lines behind it.
  ctx.strokeStyle = "rgba(35,39,47,0.25)"; ctx.beginPath(); ctx.moveTo(x + w + 10, top + 4); ctx.lineTo(x + w + 20, top + 4); ctx.moveTo(x + w + 8, top + 10); ctx.lineTo(x + w + 16, top + 10); ctx.stroke();
  ctx.restore();
}

// Rolling obstacle: a dodgeball that spins as it comes toward the runner.
function drawBall(ctx: CanvasRenderingContext2D, x: number, w: number, h: number, spin: number) {
  ctx.save();
  const r = Math.min(w, h) / 2 + 2;
  const cx = x + w / 2; const cy = GROUND_Y - r;
  ctx.fillStyle = "rgba(28,36,48,0.16)"; ctx.beginPath(); ctx.ellipse(cx, GROUND_Y + 5, r * 0.8, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FF6B6B"; ctx.strokeStyle = OBBY_COLORS.ink; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.translate(cx, cy); ctx.rotate(spin);
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r - 4, -0.6, 0.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r - 4, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke();
  ctx.restore();
}

const BUNTING = ["#FF8FB1", "#FFD166", "#7BDFF2", "#B8F2A6", "#C9A7FF"];

// Cute poster between the windows: a cat, a rainbow or a heart.
function drawPoster(ctx: CanvasRenderingContext2D, x: number, y: number, kind: number) {
  ctx.save();
  ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "rgba(35,39,47,0.25)"; ctx.lineWidth = 1.5;
  fillRoundedRect(ctx, x, y, 34, 34, 5); ctx.strokeRect(x, y, 34, 34);
  const cx = x + 17; const cy = y + 18;
  if (kind === 0) { // cat face
    ctx.fillStyle = "#FFC48C";
    ctx.beginPath(); ctx.moveTo(cx - 10, cy - 4); ctx.lineTo(cx - 8, cy - 13); ctx.lineTo(cx - 2, cy - 7); ctx.lineTo(cx + 2, cy - 7); ctx.lineTo(cx + 8, cy - 13); ctx.lineTo(cx + 10, cy - 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = OBBY_COLORS.ink; ctx.beginPath(); ctx.arc(cx - 4, cy - 1, 1.6, 0, Math.PI * 2); ctx.arc(cx + 4, cy - 1, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FF8FB1"; ctx.beginPath(); ctx.arc(cx - 6, cy + 3, 1.8, 0, Math.PI * 2); ctx.arc(cx + 6, cy + 3, 1.8, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 1) { // rainbow
    ["#FF8FB1", "#FFD166", "#7BDFF2", "#C9A7FF"].forEach((color, index) => {
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy + 6, 12 - index * 3, Math.PI, 0); ctx.stroke();
    });
  } else { // heart
    ctx.fillStyle = "#FF6B8B";
    ctx.beginPath(); ctx.moveTo(cx, cy + 8); ctx.bezierCurveTo(cx - 14, cy - 2, cx - 6, cy - 12, cx, cy - 4); ctx.bezierCurveTo(cx + 6, cy - 12, cx + 14, cy - 2, cx, cy + 8); ctx.fill();
  }
  ctx.restore();
}

function drawClassroomDetails(ctx: CanvasRenderingContext2D, camera: number) {
  ctx.fillStyle = "rgba(143,185,217,0.7)";
  for (let i = Math.floor(camera / 240) - 1; i < Math.floor(camera / 240) + 3; i += 1) {
    const x = i * 240 - camera + 24;
    ctx.fillRect(x, 94, 70, 58); ctx.strokeStyle = OBBY_COLORS.metal; ctx.lineWidth = 2; ctx.strokeRect(x, 94, 70, 58);
    ctx.strokeStyle = "rgba(35,39,47,0.35)"; ctx.beginPath(); ctx.moveTo(x + 35, 94); ctx.lineTo(x + 35, 152); ctx.moveTo(x, 123); ctx.lineTo(x + 70, 123); ctx.stroke();
    ctx.fillStyle = OBBY_COLORS.cream; ctx.fillRect(x + 85, 106, 54, 30); ctx.strokeStyle = OBBY_COLORS.green; ctx.strokeRect(x + 85, 106, 54, 30);
    ctx.fillStyle = OBBY_COLORS.inkSoft; ctx.font = "700 7px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText(obbyLook.signs[Math.abs(i) % 2], x + 112, 124);
  }
  // Party bunting along the ceiling and a cute poster in every other gap.
  for (let i = Math.floor(camera / 24) - 1; i < Math.floor(camera / 24) + 17; i += 1) {
    const x = i * 24 - camera;
    ctx.fillStyle = BUNTING[((i % BUNTING.length) + BUNTING.length) % BUNTING.length];
    ctx.beginPath(); ctx.moveTo(x, 92); ctx.lineTo(x + 20, 92); ctx.lineTo(x + 10, 104); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = "rgba(35,39,47,0.3)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 92); ctx.lineTo(OBBY_WIDTH, 92); ctx.stroke();
  for (let i = Math.floor(camera / 480) - 1; i < Math.floor(camera / 480) + 2; i += 1) {
    drawPoster(ctx, i * 480 - camera + 180, 180, ((i % 3) + 3) % 3);
  }
  ctx.fillStyle = "rgba(93,102,112,0.5)";
  for (let i = Math.floor(camera / 300) - 1; i < Math.floor(camera / 300) + 3; i += 1) {
    const x = i * 300 - camera + 150;
    ctx.fillRect(x, 74, 2, 14); ctx.fillRect(x - 18, 74, 38, 2); // ceiling fan hint
  }
}

// Obstacles: classic school clutter plus Gen Alpha desk favourites. The drawing
// changes only the look — every obstacle keeps its hitbox.
function drawSchoolObject(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, index: number) {
  ctx.save(); ctx.strokeStyle = OBBY_COLORS.ink; ctx.lineWidth = 1.5;
  const kind = ((index % 7) + 7) % 7;
  if (kind === 0) { // fallen chair
    ctx.strokeStyle = OBBY_COLORS.metal; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 8, y + h); ctx.lineTo(x + w - 5, y + 4); ctx.moveTo(x + 2, y + 8); ctx.lineTo(x + w - 8, y + h); ctx.stroke();
    ctx.fillStyle = OBBY_COLORS.wood; ctx.fillRect(x + 4, y + 3, w - 8, 5);
  } else if (kind === 1) { // backpack with a keychain charm
    ctx.fillStyle = "#8FA8FF"; fillRoundedRect(ctx, x, y + 8, w, h - 8, 6); ctx.fillStyle = OBBY_COLORS.cream; ctx.beginPath(); ctx.arc(x + w / 2, y + 8, w * 0.35, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#FF8FB1"; ctx.beginPath(); ctx.arc(x + w - 6, y + h - 6, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (kind === 2) { // stacked books
    ctx.fillStyle = OBBY_COLORS.wood; ctx.fillRect(x + 2, y + h - 8, w - 4, 7); ctx.fillStyle = OBBY_COLORS.green; ctx.fillRect(x + 6, y + h - 16, w - 10, 7); ctx.fillStyle = OBBY_COLORS.yellow; ctx.fillRect(x + 1, y + h - 24, w - 2, 7); ctx.strokeRect(x + 1, y + h - 24, w - 2, 23);
  } else if (kind === 3) { // slime jar
    ctx.fillStyle = "#9BF6C4"; fillRoundedRect(ctx, x + 4, y + 6, w - 8, h - 6, 6); ctx.strokeRect(x + 4, y + 6, w - 8, h - 6);
    ctx.fillStyle = "#C9A7FF"; ctx.fillRect(x + 2, y + 2, w - 4, 6); ctx.strokeRect(x + 2, y + 2, w - 4, 6);
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(x + 12, y + 16, 3, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 4) { // pop-it fidget, two rows of bubbles filling the obstacle
    ctx.fillStyle = "#FFD166"; fillRoundedRect(ctx, x, y + 2, w, h - 2, 6); ctx.strokeRect(x, y + 2, w, h - 2);
    const colors = ["#FF8FB1", "#7BDFF2", "#B8F2A6", "#C9A7FF"];
    for (let row = 0; row < 2; row += 1) for (let col = 0; col < 4; col += 1) {
      ctx.fillStyle = colors[(col + row) % 4]; ctx.beginPath(); ctx.arc(x + 6 + col * ((w - 12) / 3), y + 8 + row * ((h - 10) / 2 + 1), 3.2, 0, Math.PI * 2); ctx.fill();
    }
  } else if (kind === 5) { // big tumbler with a straw
    ctx.fillStyle = "#FFB5C8"; ctx.beginPath(); ctx.moveTo(x + 8, y + 6); ctx.lineTo(x + w - 8, y + 6); ctx.lineTo(x + w - 12, y + h); ctx.lineTo(x + 12, y + h); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x + 7, y + 2, w - 14, 5); ctx.strokeRect(x + 7, y + 2, w - 14, 5);
    ctx.strokeStyle = "#7BDFF2"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + w / 2 + 2, y + 3); ctx.lineTo(x + w / 2 + 6, y - 8); ctx.stroke();
  } else { // game controller, full obstacle height
    ctx.fillStyle = "#C9A7FF"; fillRoundedRect(ctx, x + 1, y + 2, w - 2, h - 2, 9); ctx.strokeRect(x + 1, y + 2, w - 2, h - 2);
    const mid = y + h / 2 + 1;
    ctx.fillStyle = OBBY_COLORS.ink; ctx.fillRect(x + 7, mid - 1, 8, 2.5); ctx.fillRect(x + 9.8, mid - 4, 2.5, 8);
    ctx.fillStyle = "#FF6B8B"; ctx.beginPath(); ctx.arc(x + w - 10, mid - 2, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7BDFF2"; ctx.beginPath(); ctx.arc(x + w - 6, mid + 2, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

type Outcome = {
  kind: "failed" | "complete"; level: number; checkpoint: number; seconds: number; progress: number; reason: "gap" | "hazard" | null;
  isNewBest: boolean; runScore: number; stories: number; totalStories: number; levelBest: number;
  collected: Partial<Record<ThemeId, number>>;
  daily: { hit: boolean; remaining: string; label: string };
};

function drawHatch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  for (let offset = -h; offset < w; offset += 8) {
    ctx.beginPath();
    ctx.moveTo(x + offset, y + h);
    ctx.lineTo(x + offset + h, y);
    ctx.stroke();
  }
  ctx.restore();
}

export default function ObbyGame({ candidates }: { candidates: PlayCandidate[] }) {
  const [session] = useState(() => createPlaySession("obby"));
  const [feedback] = useState(() => createGameFeedback());
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [stats, setStats] = useState<GameStats | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const stateRef = useRef<ObbyState>(createObbyState(1));
  const phaseRef = useRef<GamePhase>("ready");
  const scoreRef = useRef<HTMLSpanElement | null>(null);
  const reducedMotion = useRef(false);
  // Score carried across consecutive cleared levels in one run.
  const runScore = useRef(0);
  const checkpoint = useRef(0);
  const sectionRef = useRef(1);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    session.impression();
    reducedMotion.current = prefersReducedMotion();
    try {
      const stored = readGameStats(window.localStorage, "obby");
      queueMicrotask(() => {
        setStats(stored);
        stateRef.current = createObbyState(Math.max(1, stored.highestLevel));
        if (scoreRef.current) scoreRef.current.textContent = "0";
      });
    } catch { /* optional */ }
  }, [session]);

  const startLevel = Math.max(1, stats?.highestLevel ?? 1);

  const finish = useCallback((kind: Outcome["kind"]) => {
    const state = stateRef.current;
    if (kind === "complete") { feedback.tone(760, 0.16, 0.04); feedback.vibrate([18, 35, 18]); }
    else { feedback.tone(120, 0.18, 0.04); feedback.vibrate([35, 45, 35]); }
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* optional */ }
    const previousStats = readGameStats(storage, "obby");
    const previousHighest = previousStats.highestLevel;
    const levelScore = obbyLevelScore(state);
    const total = runScore.current + levelScore;
    const reached = kind === "complete" ? state.level + 1 : state.level;
    if (kind === "complete") recordLevelReached(storage, "obby", reached);
    const stories = 0;
    const levelRecord = recordLevelBest(storage, "obby", state.level, 0);
    const collected: Partial<Record<ThemeId, number>> = {};
    const recorded = recordGameResult(storage, "obby", { score: total, level: reached, count: 0 });
    setStats(recorded.stats);
    const progress = Math.round(levelProgress(state) * 100);
    if (kind === "complete") {
      runScore.current = total;
      session.complete({ level: state.level, score_bucket: scoreBucket(total) });
      setAnnouncement(`Level ${state.level} complete in ${state.time.toFixed(1)} seconds. Score ${total}.`);
    } else {
      session.fail({ level: state.level, reason: state.failure ?? "gap", score_bucket: scoreBucket(total) });
      setAnnouncement(`Level ${state.level} failed at ${progress} percent. Score ${total}. Try again.`);
    }
    // A first-ever run has nothing to beat, so it is not called a "new best".
    const isNewBest = previousStats.gamesPlayed > 0 && (recorded.isNewBest || (kind === "complete" && reached > previousHighest) || levelRecord.improved);
    const today = recordDailyResult(storage, "obby", total);
    const daily = { hit: today.hit, remaining: String(today.remaining), label: today.target.label };
    setOutcome({
      daily,
      checkpoint: state.checkpoint,
      kind, level: state.level, seconds: state.time, progress, reason: state.failure, isNewBest, runScore: total, stories,
      totalStories: tokensFor(state.level).length, levelBest: levelRecord.best, collected,
    });
    setPhase("result");
  }, [feedback, session]);

  const onFrame = useCallback((dt: number) => {
    const state = stateRef.current;
    const beforeCheckpoint = state.checkpoint;
    const beforeCollected = state.collected.length;
    const status = stepObby(state, dt);
    if (state.checkpoint > beforeCheckpoint) { feedback.tone(620, 0.1); feedback.vibrate(18); }
    if (state.collected.length > beforeCollected) { feedback.tone(880, 0.06); feedback.vibrate(10); }
    if (state.level !== sectionRef.current) {
      sectionRef.current = state.level;
      setAnnouncement(`Section ${state.level}: ${levelFor(state.level).name}. Keep moving.`);
    }
    if (scoreRef.current) scoreRef.current.textContent = String(runScore.current + obbyLevelScore(state));
    if (status !== "playing" && phaseRef.current === "playing") {
      phaseRef.current = "result";
      finish(status === "complete" ? "complete" : "failed");
    }
  }, [feedback, finish]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = stateRef.current;
    const level = levelFor(state.level);
    const camera = cameraX(state);

    ctx.fillStyle = obbyLook.wall;
    ctx.fillRect(0, 0, OBBY_WIDTH, OBBY_HEIGHT);
    // A slight zoom anchored at the bottom, so the runner and obstacles read
    // larger on a phone without losing the look-ahead.
    ctx.save();
    ctx.translate(0, OBBY_HEIGHT); ctx.scale(WORLD_ZOOM, WORLD_ZOOM); ctx.translate(0, -OBBY_HEIGHT);
    drawClassroomDetails(ctx, camera);
    // A tiled school floor and a warm corridor base establish a real place.
    ctx.fillStyle = obbyLook.floor; ctx.fillRect(0, 330, OBBY_WIDTH, FLOOR_TOP - 330);
    ctx.strokeStyle = "rgba(35,39,47,0.16)"; ctx.lineWidth = 1;
    for (let x = -((camera * 0.7) % 48); x < OBBY_WIDTH; x += 48) { ctx.beginPath(); ctx.moveTo(x, 330); ctx.lineTo(x, FLOOR_TOP); ctx.stroke(); }
    for (let y = 354; y < FLOOR_TOP; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(OBBY_WIDTH, y); ctx.stroke(); }

    // The floor you must not touch: visible through every gap.
    ctx.fillStyle = "#A97855";
    ctx.fillRect(0, FLOOR_TOP, OBBY_WIDTH, OBBY_HEIGHT - FLOOR_TOP);
    drawHatch(ctx, 0, FLOOR_TOP, OBBY_WIDTH, OBBY_HEIGHT - FLOOR_TOP);

    for (const segment of level.ground) {
      const x = segment.x - camera;
      if (x > OBBY_WIDTH || x + segment.w < 0) continue;
      ctx.fillStyle = OBBY_COLORS.wood; ctx.fillRect(x, GROUND_Y, segment.w, FLOOR_TOP - GROUND_Y);
      ctx.strokeStyle = OBBY_COLORS.ink; ctx.lineWidth = 2; ctx.strokeRect(x + 1, GROUND_Y + 1, segment.w - 2, FLOOR_TOP - GROUND_Y - 2);
      ctx.fillStyle = "rgba(255,244,223,0.24)"; ctx.fillRect(x + 4, GROUND_Y + 3, Math.max(0, segment.w - 8), 3);
    }

    for (const platform of level.platforms) {
      const x = platformX(platform, state.time) - camera;
      if (x > OBBY_WIDTH || x + platform.w < 0) continue;
      ctx.fillStyle = OBBY_COLORS.wood;
      fillRoundedRect(ctx, x, platform.y, platform.w, 14, 3);
      ctx.strokeStyle = OBBY_COLORS.ink;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, platform.y + 1, platform.w - 2, 12);
      ctx.fillStyle = OBBY_COLORS.cream;
      ctx.fillRect(x + 8, platform.y + 3, Math.min(28, platform.w - 16), 3);
      ctx.strokeStyle = OBBY_COLORS.metal; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 12, platform.y + 14); ctx.lineTo(x + 12, platform.y + 23); ctx.moveTo(x + platform.w - 12, platform.y + 14); ctx.lineTo(x + platform.w - 12, platform.y + 23); ctx.stroke();
      if (platform.move) {
        // Moving platforms carry arrow marks, not just a different colour.
        ctx.strokeStyle = OBBY_COLORS.ink;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 10, platform.y + 6); ctx.lineTo(x + 16, platform.y + 3); ctx.moveTo(x + 10, platform.y + 6); ctx.lineTo(x + 16, platform.y + 9);
        ctx.moveTo(x + platform.w - 10, platform.y + 6); ctx.lineTo(x + platform.w - 16, platform.y + 3); ctx.moveTo(x + platform.w - 10, platform.y + 6); ctx.lineTo(x + platform.w - 16, platform.y + 9);
        ctx.stroke();
      }
    }

    const firstAir = level.hazards.findIndex((hazard) => hazard.air);
    const firstRoll = level.hazards.findIndex((hazard) => hazard.roll);
    level.hazards.forEach((hazard, index) => {
      const x = hazardX(hazard, state.player.x) - camera;
      if (x > OBBY_WIDTH + 20 || x + hazard.w < -20) return;
      const band = hazardBand(hazard);
      if (hazard.air) drawPaperPlane(ctx, x, band.top, hazard.w, hazard.h, state.time);
      else if (hazard.roll) drawBall(ctx, x, hazard.w, hazard.h, -(state.player.x - hazard.x) / 10);
      // Varies by position and order, so a pair shows two different objects.
      else drawSchoolObject(ctx, x, GROUND_Y - Math.max(hazard.h, 26), hazard.w + 12, Math.max(hazard.h, 26), Math.round(hazard.x / 100) + index);
      // The phase that introduces a new obstacle explains it once.
      const hint = index === firstAir && state.level === AIR_INTRO_LEVEL ? "Don't jump!" : index === firstRoll && state.level === ROLL_INTRO_LEVEL ? "Jump the ball!" : null;
      if (hint && x > state.player.x - camera) {
        ctx.fillStyle = OBBY_COLORS.ink; ctx.font = "700 11px system-ui, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(hint, x + hazard.w / 2, (hazard.air ? band.top : GROUND_Y - 40) - 14);
      }
    });

    // Finish post with a chequered flag.
    const finishX = level.length - camera;
    if (finishX < OBBY_WIDTH + 40) {
      ctx.fillStyle = OBBY_COLORS.green;
      ctx.fillRect(finishX, GROUND_Y - 96, 3, 96);
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          ctx.fillStyle = (row + col) % 2 === 0 ? OBBY_COLORS.green : OBBY_COLORS.cream;
          ctx.fillRect(finishX + 3 + col * 8, GROUND_Y - 96 + row * 8, 8, 8);
        }
      }
      ctx.strokeStyle = OBBY_COLORS.ink;
      ctx.lineWidth = 1;
      ctx.strokeRect(finishX + 3, GROUND_Y - 96, 32, 24);
    }

    // Level 1 teaches by doing: a single hint before the first gap.
    if (state.level === 1 && state.player.x < 520) {
      ctx.fillStyle = OBBY_COLORS.inkSoft;
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Tap to jump", 380 - camera, GROUND_Y - 110);
    }

    // Brisa, the runner.
    const { player } = state;
    const stretch = !reducedMotion.current && !player.onGround ? 2 : 0;
    drawObbyPlayer(ctx, player.x - camera - PLAYER_WIDTH / 2, player.y - PLAYER_HEIGHT - stretch, PLAYER_WIDTH, PLAYER_HEIGHT + stretch, !player.onGround, reducedMotion.current ? 0 : state.time);
    ctx.restore(); // end of the zoomed world; the HUD below is drawn unscaled

    // HUD strip: its own band above the zoomed world, so text never sits on decoration.
    ctx.fillStyle = obbyLook.wall; ctx.fillRect(0, 0, OBBY_WIDTH, 50);
    ctx.fillStyle = "rgba(35,39,47,0.10)"; ctx.fillRect(0, 50, OBBY_WIDTH, 1);
    // Progress and level label.
    ctx.fillStyle = "rgba(35,39,47,0.20)";
    ctx.fillRect(16, 18, OBBY_WIDTH - 32, 3);
    ctx.fillStyle = OBBY_COLORS.blue;
    ctx.fillRect(16, 18, (OBBY_WIDTH - 32) * levelProgress(state), 3);
    ctx.fillStyle = OBBY_COLORS.inkSoft;
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`SECTION ${state.level} · ${levelFor(state.level).name.toUpperCase()}`, 16, 40);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(levelProgress(state) * 100)}%`, OBBY_WIDTH - 16, 40);
  }, []);

  const { canvasRef } = useGameCanvas({ width: OBBY_WIDTH, height: OBBY_HEIGHT, running: phase === "playing", onFrame, draw });

  const begin = useCallback((level: number, keepRun = false) => {
    if (!keepRun) runScore.current = 0;
    checkpoint.current = 0;
    sectionRef.current = level;
    obbyLook = OBBY_LOOKS[dailyShift("obby") % OBBY_LOOKS.length];
    stateRef.current = createObbyState(level);
    setOutcome(null);
    setAnnouncement(`Level ${level}. Tap, Space or Up arrow to jump.`);
    session.start();
    setPhase("playing");
  }, [session]);

  const jump = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const beforeJump = stateRef.current.player.vy;
    requestJump(stateRef.current);
    if (stateRef.current.player.vy !== beforeJump) { feedback.tone(520, 0.07); feedback.vibrate(12); }
    session.firstAction();
  }, [feedback, session]);

  const pause = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    session.pause();
    setAnnouncement("Paused.");
    setPhase("paused");
  }, [session]);
  const resume = useCallback(() => { session.resume(); setAnnouncement(""); setPhase("playing"); }, [session]);
  const retry = useCallback(() => { session.replay(); begin(stateRef.current.level); }, [begin, session]);
  const nextLevel = useCallback((level: number) => begin(level, true), [begin]);

  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === " " || event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
        event.preventDefault();
        if (!event.repeat) jump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, jump]);

  const best = stats && stats.highestLevel > 1 ? `Reached section ${stats.highestLevel}` : null;

  let result = null;
  if (outcome) {
    const copy = obbyResultCopy({
      complete: outcome.kind === "complete", level: outcome.level, progress: outcome.progress, seconds: outcome.seconds,
      reason: outcome.reason, stories: outcome.stories, totalStories: outcome.totalStories, isNewBest: outcome.isNewBest,
    });
    result = (
      <GameResult
        variant="obby"
        copy={copy}
        primary={outcome.kind === "failed"
          ? { label: "Play again", onClick: retry }
          : { label: "Next level", onClick: () => nextLevel(outcome.level + 1) }}
        secondary={outcome.kind === "complete" ? { label: "Replay this level", onClick: retry } : undefined}
        daily={outcome.daily}
        session={session}
        share={{ game: "TodayAI Obby", path: "/play/obby" }}
      />
    );
  }

  return (
    <GameShell
      title="TodayAI Obby"
      tagline="Make it through the school day."
      controls="Tap to jump · Space / ↑ on desktop"
      phase={phase}
      width={OBBY_WIDTH}
      height={OBBY_HEIGHT}
      scoreLabel="Score"
      scoreRef={scoreRef}
      best={best}
      startLabel={startLevel > 1 ? `Play level ${startLevel}` : "Play"}
      theme="obby"
      challenge="Reach the next school section"
      game="obby"
      after={outcome && <PlayNext game="obby" candidates={candidates} session={session} collected={outcome.collected} />}
      touchHint="Tap anywhere to jump"
      mobileInstructions={["Tap once to jump over gaps and floor hazards", "Watch for floating hazards above your head", "Reach checkpoints and collect stickers"]}
      onStart={() => begin(startLevel)}
      onPause={pause}
      onResume={resume}
      onRestart={retry}
      announcement={announcement}
      result={result}
    >
      <canvas
        ref={canvasRef}
        aria-label="TodayAI Obby game area"
        role="img"
        className="absolute inset-0 h-full w-full select-none"
        onPointerDown={(event) => { event.preventDefault(); jump(); }}
      />
    </GameShell>
  );
}
