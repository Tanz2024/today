"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GameShell, { type GamePhase } from "@/components/play/GameShell";
import GameResult from "@/components/play/GameResult";
import PlayNext from "@/components/play/PlayNext";
import { fillRoundedRect } from "@/components/play/canvas";
import { prefersReducedMotion, useGameCanvas } from "@/components/play/useGameCanvas";
import {
  JUMP_DISTANCE, LANE_CENTERS, OBSTACLE_HALF_HEIGHT, OBSTACLE_HALF_WIDTH, PLAYER_Y, RUSH_HEIGHT, RUSH_WIDTH,
  createRushState, jump, moveLane, rushScore, stepRush, type RushState,
} from "@/lib/play/rush";
import { createPlaySession, scoreBucket } from "@/lib/play/analytics";
import { rushResultCopy } from "@/lib/play/result-copy";
import type { ThemeId } from "@/lib/play/themes";
import { recordDailyResult } from "@/lib/play/daily";
import { addToCollection, readGameStats, recordGameResult, type GameStats } from "@/lib/play/storage";
import type { PlayCandidate } from "@/lib/play/candidates";
import { createGameFeedback } from "@/lib/play/feedback";

const SWIPE_PX = 26;
const CROSSING_EVERY = 1300;

type Outcome = {
  score: number; meters: number; markers: number; bestCombo: number; isNewBest: boolean; previousBest: number;
  collected: Partial<Record<ThemeId, number>>;
  daily: { hit: boolean; remaining: string; label: string };
};

function formatScore(score: number) {
  return score.toLocaleString("en-US");
}

const RUSH_COLORS = {
  sky: "#18203A",
  horizon: "#C06C4E",
  background: "#26252A",
  road: "#343434",
  roadEdge: "#6B5B53",
  lane: "#E8DCCB",
  text: "#F8F5EF",
  muted: "#C8BFB6",
  player: "#4F7CFF",
  playerAccent: "#DDE6FF",
  obstacle: "#4B3533",
  danger: "#E85D5D",
  collectible: "#F3C969",
  bonus: "#5FD5C8",
};

function drawRunner(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.shadowColor = "rgba(17,17,17,0.28)";
  ctx.shadowBlur = 5;
  // A tiny human runner keeps Rush character-led instead of icon-led.
  ctx.fillStyle = "#F0B58D";
  ctx.beginPath(); ctx.arc(x + size * 0.52, y + size * 0.2, size * 0.19, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3B3030"; ctx.beginPath(); ctx.arc(x + size * 0.52, y + size * 0.15, size * 0.2, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = RUSH_COLORS.player;
  fillRoundedRect(ctx, x + size * 0.2, y + size * 0.34, size * 0.6, size * 0.43, size * 0.15);
  ctx.fillStyle = RUSH_COLORS.bonus;
  fillRoundedRect(ctx, x + size * 0.05, y + size * 0.38, size * 0.18, size * 0.31, size * 0.06);
  ctx.fillStyle = RUSH_COLORS.playerAccent;
  fillRoundedRect(ctx, x + size * 0.31, y + size * 0.43, size * 0.34, size * 0.13, size * 0.05);
  ctx.fillStyle = RUSH_COLORS.player;
  fillRoundedRect(ctx, x + size * 0.21, y + size * 0.73, size * 0.25, size * 0.13, size * 0.05);
  fillRoundedRect(ctx, x + size * 0.55, y + size * 0.73, size * 0.25, size * 0.13, size * 0.05);
  /*
  ctx.shadowBlur = 0;
  ctx.fillStyle = RUSH_COLORS.playerAccent;
  ctx.beginPath();
  ctx.arc(x + size * 0.72, y + size * 0.27, size * 0.14, 0, Math.PI * 2);
  ctx.fill();
  // A small cream visor gives the Brisa runner a face without turning it into
  // a detailed character that becomes unreadable at phone scale.
  ctx.fillStyle = "#FFFFFF";
  fillRoundedRect(ctx, x + size * 0.22, y + size * 0.38, size * 0.43, size * 0.17, size * 0.08);
  ctx.fillStyle = RUSH_COLORS.playerAccent;
  ctx.fillRect(x + size * 0.28, y + size * 0.42, size * 0.08, size * 0.08);
  ctx.fillRect(x + size * 0.49, y + size * 0.42, size * 0.08, size * 0.08);
  ctx.fillStyle = RUSH_COLORS.player;
  ctx.fillRect(x + size * 0.74, y + size * 0.55, size * 0.12, size * 0.08);
  */
  ctx.restore();
}

export default function RushGame({ candidates }: { candidates: PlayCandidate[] }) {
  const [session] = useState(() => createPlaySession("rush"));
  const [feedback] = useState(() => createGameFeedback());
  const [phase, setPhase] = useState<GamePhase>("ready");
  const [stats, setStats] = useState<GameStats | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const stateRef = useRef<RushState>(createRushState(1));
  const phaseRef = useRef<GamePhase>("ready");
  const scoreRef = useRef<HTMLSpanElement | null>(null);
  const shownScore = useRef(-1);
  const reducedMotion = useRef(false);
  const gesture = useRef<{ id: number; x: number; y: number; handled: boolean } | null>(null);
  // Previous best distance in street pixels, drawn as a line to chase.
  const bestLine = useRef(0);
  const bestCombo = useRef(0);
  const milestone = useRef(0);
  const tutorialVisible = useRef(true);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    session.impression();
    reducedMotion.current = prefersReducedMotion();
    try { queueMicrotask(() => setStats(readGameStats(window.localStorage, "rush"))); } catch { /* optional */ }
  }, [session]);

  const syncScore = useCallback(() => {
    const score = rushScore(stateRef.current);
    if (score !== shownScore.current && scoreRef.current) {
      shownScore.current = score;
      scoreRef.current.textContent = formatScore(score);
    }
  }, []);

  const finish = useCallback(() => {
    const state = stateRef.current;
    feedback.tone(110, 0.18, 0.04); feedback.vibrate([30, 40, 30]);
    const score = rushScore(state);
    const meters = Math.floor(state.distance / 10);
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* optional */ }
    const previousBest = readGameStats(storage, "rush").bestDistance;
    const recorded = recordGameResult(storage, "rush", { score, distance: meters, count: state.markers });
    const collected = { ...state.collected };
    addToCollection(storage, score, collected);
    setStats(recorded.stats);
    session.fail({ score_bucket: scoreBucket(score) });
    setAnnouncement(`Run over. Score ${formatScore(score)}, ${meters} metres, ${state.markers} stories.`);
    const isNewBest = previousBest > 0 && meters > previousBest;
    const today = recordDailyResult(storage, "rush", meters);
    const daily = { hit: today.hit, remaining: `${formatScore(today.remaining)}m`, label: today.target.label };
    setOutcome({ score, meters, markers: state.markers, bestCombo: bestCombo.current, isNewBest, previousBest, collected, daily });
    setPhase("result");
  }, [feedback, session]);

  const onFrame = useCallback((dt: number) => {
    const state = stateRef.current;
    const beforeMarkers = state.markers;
    stepRush(state, dt);
    if (state.markers > beforeMarkers) { feedback.tone(880, 0.06); feedback.vibrate(10); }
    const distanceMeters = Math.floor(state.distance / 10);
    const nextMilestone = Math.floor(distanceMeters / 500) * 500;
    if (nextMilestone >= 500 && nextMilestone > milestone.current) {
      milestone.current = nextMilestone;
      session.milestone(nextMilestone);
      setAnnouncement(`${nextMilestone} metres. Keep going.`);
    }
    bestCombo.current = Math.max(bestCombo.current, state.combo);
    syncScore();
    if (state.status === "over" && phaseRef.current === "playing") {
      phaseRef.current = "result";
      finish();
    }
  }, [feedback, finish, session, syncScore]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const state = stateRef.current;
    const roadGradient = ctx.createLinearGradient(0, 0, 0, RUSH_HEIGHT);
    roadGradient.addColorStop(0, RUSH_COLORS.horizon);
    roadGradient.addColorStop(0.22, "#754A43");
    roadGradient.addColorStop(0.35, RUSH_COLORS.road);
    roadGradient.addColorStop(1, "#29292B");
    ctx.fillStyle = RUSH_COLORS.background;
    ctx.fillRect(0, 0, RUSH_WIDTH, RUSH_HEIGHT);
    const skyGradient = ctx.createLinearGradient(0, 0, 0, 150);
    skyGradient.addColorStop(0, RUSH_COLORS.sky);
    skyGradient.addColorStop(1, RUSH_COLORS.horizon);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, RUSH_WIDTH, 142);
    ctx.fillStyle = "rgba(243,201,105,0.16)";
    ctx.beginPath(); ctx.arc(RUSH_WIDTH / 2, 116, 15, 0, Math.PI * 2); ctx.fill();
    // The road narrows toward a warm horizon, giving the runner a world to
    // move through without introducing distracting city scenery.
    ctx.fillStyle = roadGradient;
    ctx.beginPath();
    ctx.moveTo(124, 136); ctx.lineTo(236, 136); ctx.lineTo(326, RUSH_HEIGHT); ctx.lineTo(34, RUSH_HEIGHT);
    ctx.closePath(); ctx.fill();
    // Sparse roadside memories: lamps, utility poles, and a distant pickup
    // sign make the street feel inhabited without becoming a busy backdrop.
    // Far depth: low silhouettes keep the horizon authored without competing
    // with the road. Their parallax is deliberately quieter than the road.
    const farOffset = reducedMotion.current ? 0 : (state.distance * 0.08) % 180;
    ctx.fillStyle = "rgba(37,38,63,0.42)";
    for (let x = -farOffset - 40; x < RUSH_WIDTH + 220; x += 92) {
      const height = 8 + ((Math.floor((x + farOffset) / 92) % 3 + 3) % 3) * 5;
      ctx.fillRect(x, 136 - height, 64, height);
      ctx.fillStyle = "rgba(243,232,213,0.10)";
      ctx.fillRect(x + 10, 132 - height, 4, 3); ctx.fillRect(x + 24, 132 - height, 4, 3);
      ctx.fillStyle = "rgba(37,38,63,0.42)";
    }
    // Midground dressing uses a deterministic visual sequence rather than a
    // repeated pole. Decorations never enter the collision model.
    const roadside = ["lamp", "tree", "empty", "sign", "rail", "building", "empty", "lamp"] as const;
    const roadsideOffset = reducedMotion.current ? 0 : (state.distance * 0.32) % 210;
    const firstRoadside = Math.floor(state.distance / 210) - 1;
    for (let index = firstRoadside; index < firstRoadside + 5; index += 1) {
      const kind = roadside[((index % roadside.length) + roadside.length) % roadside.length];
      const side = index % 2 === 0 ? 1 : -1;
      const baseX = side > 0 ? 280 : 80;
      const objectX = baseX + (index * 17 % 22) * side - roadsideOffset * side * 0.1;
      if (kind === "empty") continue;
      if (kind === "lamp") {
        ctx.strokeStyle = "rgba(35,31,37,0.45)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(objectX, 157); ctx.lineTo(objectX + side * 4, 105); ctx.stroke();
        ctx.fillStyle = "rgba(243,201,105,0.42)"; ctx.beginPath(); ctx.arc(objectX + side * 4, 103, 3, 0, Math.PI * 2); ctx.fill();
      } else if (kind === "tree") {
        ctx.fillStyle = "rgba(47,69,62,0.52)"; ctx.fillRect(objectX - 2, 126, 4, 30);
        ctx.beginPath(); ctx.arc(objectX, 116, 14, 0, Math.PI * 2); ctx.fill();
      } else if (kind === "sign") {
        ctx.fillStyle = "rgba(93,102,112,0.55)"; ctx.fillRect(objectX, 117, 2, 39);
        ctx.fillStyle = "rgba(79,124,255,0.40)"; fillRoundedRect(ctx, objectX - 10, 112, 20, 11, 2);
      } else if (kind === "rail") {
        ctx.strokeStyle = "rgba(232,220,203,0.28)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(objectX - side * 50, 148); ctx.lineTo(objectX + side * 50, 148); ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(61,57,65,0.40)"; ctx.fillRect(objectX - 18, 124, 36, 32);
      }
    }
    ctx.fillStyle = RUSH_COLORS.roadEdge;
    ctx.beginPath();
    ctx.moveTo(118, 136); ctx.lineTo(124, 136); ctx.lineTo(34, RUSH_HEIGHT); ctx.lineTo(22, RUSH_HEIGHT); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(236, 136); ctx.lineTo(242, 136); ctx.lineTo(338, RUSH_HEIGHT); ctx.lineTo(326, RUSH_HEIGHT); ctx.closePath(); ctx.fill();

    // Compact in-game readout: the distance goal stays visible without
    // competing with the shared site/game header.
    ctx.fillStyle = "rgba(24,32,58,0.72)";
    fillRoundedRect(ctx, 16, 12, 132, 31, 7);
    ctx.fillStyle = RUSH_COLORS.muted;
    ctx.font = "700 8px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("DISTANCE", 27, 23);
    ctx.fillStyle = RUSH_COLORS.text;
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.fillText(`${Math.floor(state.distance / 10)}m`, 27, 36);
    if (bestLine.current > 0) {
      ctx.fillStyle = "#FFD166";
      ctx.font = "700 9px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`BEST ${Math.floor(bestLine.current / 10)}m`, 143, 30);
    }

    // Zebra crossings pass by now and then — a sense of streets and speed.
    const crossingY = (state.distance % CROSSING_EVERY) - 120;
    if (crossingY > -40 && crossingY < RUSH_HEIGHT) {
      ctx.fillStyle = "rgba(232,220,203,0.18)";
      for (let x = 18; x < RUSH_WIDTH - 18; x += 30) ctx.fillRect(x, crossingY, 16, 36);
    }

    // Lane dashes widen toward the player to reinforce forward motion.
    ctx.fillStyle = RUSH_COLORS.lane;
    const dashOffset = state.distance % 38;
    for (const x of [120, 240]) {
      for (let y = -34 + dashOffset; y < RUSH_HEIGHT; y += 38) {
        const depth = Math.max(0.65, Math.min(1.25, 0.65 + y / RUSH_HEIGHT));
        const horizonX = RUSH_WIDTH / 2 + (x - RUSH_WIDTH / 2) * 0.18;
        const laneX = horizonX + (x - horizonX) * Math.max(0, (y - 120) / (RUSH_HEIGHT - 120));
        ctx.globalAlpha = Math.min(0.72, 0.42 + depth * 0.20);
        ctx.fillRect(laneX - 0.8 * depth, y, 1.6 * depth, 10 * depth);
      }
    }
    ctx.globalAlpha = 1;

    for (const obstacle of state.obstacles) {
      const cx = LANE_CENTERS[obstacle.lane];
      const scale = Math.max(0.62, Math.min(0.98, 0.62 + Math.max(0, obstacle.y - 110) / 650));
      const w = OBSTACLE_HALF_WIDTH[obstacle.kind] * 2 * scale;
      const h = OBSTACLE_HALF_HEIGHT[obstacle.kind] * 2 * scale;
      if (obstacle.kind === "marker") {
        ctx.fillStyle = RUSH_COLORS.collectible;
        ctx.save(); ctx.translate(cx, obstacle.y); ctx.rotate(Math.PI / 4);
        fillRoundedRect(ctx, -9 * scale, -9 * scale, 18 * scale, 18 * scale, 4 * scale);
        ctx.restore();
        ctx.fillStyle = RUSH_COLORS.bonus; ctx.fillRect(cx - 2, obstacle.y - 6, 4, 12); ctx.fillRect(cx - 6, obstacle.y - 2, 12, 4);
      } else if (obstacle.kind === "tall") {
        // A parked delivery van: immediately recognizable as something in a
        // street, while retaining the existing tall-obstacle hitbox.
        ctx.fillStyle = "rgba(17,17,17,0.25)";
        ctx.beginPath(); ctx.ellipse(cx, obstacle.y + h * 0.5, w * 0.5, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = RUSH_COLORS.obstacle;
        fillRoundedRect(ctx, cx - w / 2, obstacle.y - h / 2, w, h, 5);
        ctx.fillStyle = "#66727D";
        fillRoundedRect(ctx, cx - w * 0.31, obstacle.y - h * 0.32, w * 0.62, h * 0.24, 3);
        ctx.fillStyle = "#B8D2D8";
        fillRoundedRect(ctx, cx - w * 0.25, obstacle.y - h * 0.28, w * 0.2, h * 0.14, 2);
        fillRoundedRect(ctx, cx + w * 0.05, obstacle.y - h * 0.28, w * 0.2, h * 0.14, 2);
        ctx.fillStyle = RUSH_COLORS.danger;
        fillRoundedRect(ctx, cx - w * 0.38, obstacle.y + h * 0.2, w * 0.16, h * 0.12, 2);
        fillRoundedRect(ctx, cx + w * 0.22, obstacle.y + h * 0.2, w * 0.16, h * 0.12, 2);
        ctx.fillStyle = "#191B20";
        ctx.beginPath(); ctx.arc(cx - w * 0.28, obstacle.y + h * 0.43, h * 0.13, 0, Math.PI * 2); ctx.arc(cx + w * 0.28, obstacle.y + h * 0.43, h * 0.13, 0, Math.PI * 2); ctx.fill();
      } else if (obstacle.kind === "cone") {
        // A single traffic cone: a smaller silhouette with the same jump cue.
        ctx.fillStyle = RUSH_COLORS.danger;
        ctx.beginPath();
        ctx.moveTo(cx, obstacle.y - h / 2);
        ctx.lineTo(cx + w / 2, obstacle.y + h / 2);
        ctx.lineTo(cx - w / 2, obstacle.y + h / 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = RUSH_COLORS.collectible;
        ctx.fillRect(cx - w * 0.28, obstacle.y, w * 0.56, Math.max(2, h * 0.16));
        ctx.fillRect(cx - w * 0.45, obstacle.y + h * 0.38, w * 0.9, Math.max(2, h * 0.14));
      } else if (obstacle.kind === "puddle") {
        // A reflective puddle reads as a ground hazard and keeps the visual
        // language distinct from the striped roadwork barrier.
        ctx.fillStyle = "#6FB7C7";
        ctx.beginPath(); ctx.ellipse(cx, obstacle.y, w / 2, Math.max(3, h / 2), 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(cx - w * 0.12, obstacle.y - 1, w * 0.22, 2, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        // A roadwork barrier/cone cluster: the object explains the jump.
        ctx.fillStyle = RUSH_COLORS.danger;
        fillRoundedRect(ctx, cx - w / 2, obstacle.y - h / 2, w, h, 4);
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx - w / 2, obstacle.y - h / 2, w, h);
        ctx.clip();
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 3;
        for (let x = cx - w / 2 - h; x < cx + w / 2; x += 12) {
          ctx.beginPath();
          ctx.moveTo(x, obstacle.y + h / 2);
          ctx.lineTo(x + h, obstacle.y - h / 2);
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = RUSH_COLORS.collectible;
        ctx.beginPath(); ctx.moveTo(cx - w * 0.22, obstacle.y - h * 0.45); ctx.lineTo(cx - w * 0.12, obstacle.y - h * 0.88); ctx.lineTo(cx, obstacle.y - h * 0.45); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + w * 0.02, obstacle.y - h * 0.45); ctx.lineTo(cx + w * 0.12, obstacle.y - h * 0.88); ctx.lineTo(cx + w * 0.24, obstacle.y - h * 0.45); ctx.closePath(); ctx.fill();
      }
    }

    // The ready/paused canvas preview stays game-like even before the first
    // procedural row has spawned. These are visual preview objects only.
    if (phaseRef.current !== "playing" && phaseRef.current !== "result") {
      const previewX = LANE_CENTERS[1];
      ctx.fillStyle = "rgba(17,17,17,0.22)";
      ctx.beginPath(); ctx.ellipse(previewX, 290, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = RUSH_COLORS.obstacle;
      fillRoundedRect(ctx, previewX - 23, 260, 46, 30, 5);
      ctx.fillStyle = "#AFC5CA"; fillRoundedRect(ctx, previewX - 14, 266, 28, 8, 2);
      ctx.fillStyle = RUSH_COLORS.danger; ctx.fillRect(previewX - 17, 281, 6, 3); ctx.fillRect(previewX + 11, 281, 6, 3);
      ctx.fillStyle = RUSH_COLORS.collectible;
      ctx.beginPath(); ctx.arc(LANE_CENTERS[2], 214, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = RUSH_COLORS.bonus; ctx.fillRect(LANE_CENTERS[2] - 4, 212, 8, 2); ctx.fillRect(LANE_CENTERS[2] - 1, 209, 2, 8);
    }

    // Your best distance rolls toward you as a roadside checkpoint.
    const bestY = PLAYER_Y - (bestLine.current - state.distance);
    if (bestLine.current > 0 && bestY > 0 && bestY < RUSH_HEIGHT) {
      ctx.strokeStyle = "rgba(243,201,105,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(26, bestY); ctx.lineTo(48, bestY); ctx.stroke();
      ctx.fillStyle = RUSH_COLORS.collectible;
      fillRoundedRect(ctx, 20, bestY - 18, 72, 16, 4);
      ctx.fillStyle = "#302A2B";
      ctx.font = "800 8px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`BEST ${Math.floor(bestLine.current / 10)}m`, 26, bestY - 7);
    }

    // Runner: lifts and grows while jumping, with a shadow left on the street.
    const progress = state.jump > 0 ? 1 - state.jump / JUMP_DISTANCE : 0;
    const lift = Math.sin(progress * Math.PI);
    const size = 42 * (1 + lift * (reducedMotion.current ? 0.08 : 0.16));
    const runPhase = state.jump > 0 ? 0 : Math.sin(state.time * 18) * (reducedMotion.current ? 0 : 1);
    ctx.fillStyle = "rgba(17,17,17,0.14)";
    ctx.beginPath();
    ctx.ellipse(state.x, PLAYER_Y + 12, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!reducedMotion.current && state.speed > 330) {
      ctx.strokeStyle = "rgba(95,213,200,0.34)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(state.x - 20, PLAYER_Y - 7); ctx.lineTo(state.x - 30, PLAYER_Y - 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(state.x + 20, PLAYER_Y + 2); ctx.lineTo(state.x + 27, PLAYER_Y + 2); ctx.stroke();
    }
    drawRunner(ctx, state.x - size / 2 + runPhase * 1.2, PLAYER_Y - size / 2 - lift * 18 + Math.abs(runPhase) * 0.5, size);

    // Combo readout.
    if (state.combo >= 2) {
      ctx.fillStyle = "#FFD166";
      ctx.font = "800 14px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`×${state.combo} COMBO`, RUSH_WIDTH - 12, 28);
    }

    // The first two rows teach the two moves, in the game itself.
    if (phaseRef.current === "playing" && tutorialVisible.current && state.rowsSpawned <= 2 && state.time < 1.8) {
      ctx.fillStyle = RUSH_COLORS.muted;
      ctx.font = "600 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(state.rowsSpawned < 2 ? "Tap left or right to switch lanes" : "Swipe up or press Space to jump", RUSH_WIDTH / 2, 64);
    }
  }, []);

  const { canvasRef } = useGameCanvas({ width: RUSH_WIDTH, height: RUSH_HEIGHT, running: phase === "playing", onFrame, draw });

  const begin = useCallback(() => {
    stateRef.current = createRushState(Date.now());
    tutorialVisible.current = true;
    bestCombo.current = 0;
    milestone.current = 0;
    try { bestLine.current = readGameStats(window.localStorage, "rush").bestDistance * 10; } catch { bestLine.current = 0; }
    shownScore.current = -1;
    syncScore();
    setOutcome(null);
    setAnnouncement("Run started. Tap left or right to switch lanes, swipe up to jump.");
    session.start();
    setPhase("playing");
  }, [session, syncScore]);

  const again = useCallback(() => { session.replay(); begin(); }, [begin, session]);

  const act = useCallback((action: "left" | "right" | "jump") => {
    if (phaseRef.current !== "playing") return;
    const state = stateRef.current;
    tutorialVisible.current = false;
    const done = action === "jump" ? jump(state) : moveLane(state, action === "left" ? -1 : 1);
    if (done) {
      session.firstAction();
      if (action === "jump") { feedback.tone(540, 0.07); feedback.vibrate(12); }
      else { feedback.tone(280, 0.045); feedback.vibrate(6); }
    }
  }, [feedback, session]);

  const pause = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    session.pause();
    setAnnouncement("Paused.");
    setPhase("paused");
  }, [session]);
  const resume = useCallback(() => { session.resume(); setAnnouncement(""); setPhase("playing"); }, [session]);

  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const action = key === "arrowleft" || key === "a" ? "left" : key === "arrowright" || key === "d" ? "right" : key === " " || key === "arrowup" || key === "w" ? "jump" : null;
      if (!action) return;
      event.preventDefault();
      if (!event.repeat) act(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, act]);

  // Swipe up = jump, swipe sideways = change lane, tap = move toward that side.
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "playing") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, handled: false };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId || active.handled) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (-dy > SWIPE_PX && -dy > Math.abs(dx)) { active.handled = true; act("jump"); }
    else if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) { active.handled = true; act(dx < 0 ? "left" : "right"); }
  };
  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const active = gesture.current;
    gesture.current = null;
    if (!active || active.id !== event.pointerId || active.handled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    act(event.clientX - rect.left < rect.width / 2 ? "left" : "right");
  };

  const best = stats && stats.bestScore > 0 ? `Best ${formatScore(stats.bestScore)} · ${formatScore(stats.bestDistance)} m` : null;

  return (
    <GameShell
      title="TodayAI Rush"
      tagline="Dodge. Jump. Beat your best."
      controls="Tap left/right · swipe up to jump · ← → / Space on desktop"
      phase={phase}
      width={RUSH_WIDTH}
      height={RUSH_HEIGHT}
      scoreLabel="Score"
      scoreRef={scoreRef}
      best={best}
      startLabel="Play"
      theme="rush"
      challenge="Beat your best distance"
      game="rush"
      after={outcome && <PlayNext game="rush" candidates={candidates} session={session} collected={outcome.collected} />}
      touchHint="Tap left or right to move · swipe up to jump"
      mobileInstructions={["Tap the left or right side to change lanes", "Swipe up to jump over barriers", "Collect story markers and keep moving"]}
      onStart={begin}
      onPause={pause}
      onResume={resume}
      onRestart={again}
      announcement={announcement}
      result={outcome && (
        <GameResult
          variant="rush"
          copy={rushResultCopy({ meters: outcome.meters, previousBest: outcome.previousBest, isNewBest: outcome.isNewBest })}
          primary={{ label: "Run again", onClick: again }}
          daily={outcome.daily}
          session={session}
          share={{ game: "TodayAI Rush", path: "/play/rush" }}
        />
      )}
    >
      <canvas
        ref={canvasRef}
        aria-label="TodayAI Rush game area"
        role="img"
        className="absolute inset-0 h-full w-full select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { gesture.current = null; }}
      />
    </GameShell>
  );
}
