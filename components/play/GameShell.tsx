"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { dailyTarget, dailyTargetHit, readStreak, recordPlayDay } from "@/lib/play/daily";
import { GAME_STORAGE_PREFIX, type GameType } from "@/lib/play/storage";
import { Pause, Play, SpeakerHigh, SpeakerSlash, X } from "@phosphor-icons/react";

export type GamePhase = "ready" | "playing" | "paused" | "result";

type Props = {
  title: string;
  tagline: string;
  controls: string;
  phase: GamePhase;
  width: number;
  height: number;
  scoreLabel: string;
  scoreRef: RefObject<HTMLSpanElement | null>;
  best: string | null;
  startLabel: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  announcement: string;
  result: ReactNode;
  children: ReactNode;
  theme?: "light" | "midnight" | "rush" | "obby";
  challenge?: string;
  /** Enables the daily target, play streak and first-run controls hint. */
  game?: GameType;
  /** Short controls for touch screens, used by the first-run hint on phones. */
  touchHint?: string;
  /** Three short, concrete steps shown before a player starts on a phone. */
  mobileInstructions?: string[];
  /** Shown under the stage on the result screen (another game, one story). */
  after?: ReactNode;
};

const primaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 bg-near-black px-7 text-[13px] font-semibold uppercase tracking-[.12em] text-white transition-colors hover:bg-electric focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-electric";
const quietButton =
  "inline-flex min-h-11 items-center justify-center px-4 text-[12px] font-semibold uppercase tracking-[.12em] text-muted transition-colors hover:text-near-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric";

export { primaryButton, quietButton };

// Shared frame for the Play games: header, a stage that fits a phone screen in
// portrait (and a larger stage with a details column on desktop),
// ready/paused/result overlays, and interruption-safe pausing.
export default function GameShell({
  title, tagline, controls, phase, width, height, scoreLabel, scoreRef, best, startLabel,
  onStart, onPause, onResume, onRestart, announcement, result, children,
  theme = "light", challenge, game, touchHint, mobileInstructions, after,
}: Props) {
  // Daily loop, read on the client only (the day and storage are per player).
  const [daily, setDaily] = useState<{ label: string; hit: boolean; streak: number } | null>(null);
  const [showHint, setShowHint] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const startTimer = useRef<number | null>(null);
  const startGame = () => {
    if (countdown !== null) return;
    setCountdown(3);
    let value = 3;
    startTimer.current = window.setInterval(() => {
      value -= 1;
      if (value <= 0) {
        if (startTimer.current !== null) window.clearInterval(startTimer.current);
        startTimer.current = null;
        setCountdown(null);
        onStart();
      } else setCountdown(value);
    }, 650);
  };
  useEffect(() => () => { if (startTimer.current !== null) window.clearInterval(startTimer.current); }, []);
  useEffect(() => {
    queueMicrotask(() => {
      try { setSoundOn(window.localStorage.getItem(GAME_STORAGE_PREFIX + "sound") !== "off"); } catch { /* optional */ }
    });
  }, []);
  const toggleSound = () => setSoundOn((current) => {
    const next = !current;
    try { window.localStorage.setItem(`${GAME_STORAGE_PREFIX}sound`, next ? "on" : "off"); } catch { /* optional */ }
    return next;
  });
  const tapFeedback = () => {
    try { if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8); } catch { /* optional */ }
  };
  useEffect(() => {
    if (!game || phase !== "ready") return;
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* optional */ }
    const next = { label: dailyTarget(game).label, hit: dailyTargetHit(storage, game), streak: readStreak(storage).current };
    queueMicrotask(() => setDaily(next));
  }, [game, phase]);
  useEffect(() => {
    if (!game || phase !== "playing") return;
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* optional */ }
    recordPlayDay(storage);
    // First run only: show the controls over the stage for a few seconds.
    const hintKey = `${GAME_STORAGE_PREFIX}hint:${game}`;
    let seen = true;
    try { seen = storage?.getItem(hintKey) === "1"; storage?.setItem(hintKey, "1"); } catch { /* optional */ }
    if (seen) return;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    queueMicrotask(() => setShowHint(touch && touchHint ? touchHint : controls));
    const timer = window.setTimeout(() => setShowHint(null), 3500);
    return () => window.clearTimeout(timer);
  }, [game, phase, touchHint, controls]);
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const midnight = theme === "midnight";
  const rush = theme === "rush";
  const obby = theme === "obby";
  const ratio = width / height;

  // Commuter rule: anything that takes the player away pauses the game.
  useEffect(() => {
    const root = document.documentElement;
    const activeGame = phase === "playing" || phase === "paused";
    root.classList.toggle("game-active", activeGame);
    return () => root.classList.remove("game-active");
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    const pause = () => onPause();
    const onVisibility = () => { if (document.hidden) onPause(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" || event.key === "p" || event.key === "P") pause(); };
    // Turning a phone sideways covers the stage with a rotate hint, so pause.
    const sideways = window.matchMedia("(orientation: landscape) and (max-height: 500px)");
    const onRotate = () => { if (sideways.matches) onPause(); };
    sideways.addEventListener("change", onRotate);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pause);
    window.addEventListener("pagehide", pause);
    window.addEventListener("keydown", onKey);
    // Move focus off the start button so Space controls the game, not the button.
    stageRef.current?.focus({ preventScroll: true });
    return () => {
      sideways.removeEventListener("change", onRotate);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pause);
      window.removeEventListener("pagehide", pause);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, onPause]);

  // Game pages open as a full-screen game surface (NYT Games / Washington Post
  // style): the site chrome is covered and page scroll is locked. Closing goes
  // back to wherever the player came from, or to the Play hub on a direct visit.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("game-open");
    return () => root.classList.remove("game-open");
  }, []);

  const close = () => {
    let cameFromSite = false;
    try {
      // Opened by an in-app link (the document was first loaded at another URL),
      // or by a full page load from another BrisaStory page.
      const landing = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.name;
      cameFromSite = (!!landing && landing !== window.location.href)
        || (!!document.referrer && new URL(document.referrer).origin === window.location.origin);
    } catch {}
    if (cameFromSite && window.history.length > 1) router.back();
    else router.push("/play");
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 flex min-h-14 shrink-0 items-center gap-3 border-b border-card-border bg-background/95 px-2 backdrop-blur sm:px-4" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden font-heading text-[15px] font-bold tracking-[-.03em] sm:inline">Brisa<span className="text-electric">Story</span></span>
          <span className="hidden text-[10px] font-bold uppercase tracking-[.16em] text-muted sm:inline">Play</span>
        </div>
        <button type="button" onClick={close} aria-label="Close game" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-near-black hover:bg-black/[.05] hover:text-electric focus-visible:outline focus-visible:outline-2 focus-visible:outline-electric">
          <X aria-hidden="true" size={20} weight="bold" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center font-heading text-[16px] font-semibold tracking-[-.01em] text-near-black sm:text-[18px]">{title}</h1>
        <div className="flex shrink-0 items-center justify-end gap-1">
          <p className="text-right text-[10px] uppercase tracking-[.12em] text-muted">
            <span className="hidden sm:inline">{scoreLabel}</span>
            <span ref={scoreRef} className="ml-1.5 font-heading text-[16px] font-semibold tabular-nums tracking-normal text-near-black sm:text-[18px]">0</span>
          </p>
          <button type="button" onClick={toggleSound} aria-label={soundOn ? "Mute game sounds" : "Turn game sounds on"} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-near-black hover:bg-black/[.05] hover:text-electric focus-visible:outline focus-visible:outline-2 focus-visible:outline-electric">
            {soundOn ? <SpeakerHigh aria-hidden="true" size={18} /> : <SpeakerSlash aria-hidden="true" size={18} />}
          </button>
          {phase === "playing" ? (
            <button type="button" onClick={onPause} aria-label="Pause game" className="inline-flex h-11 w-11 items-center justify-center rounded-full text-near-black hover:bg-black/[.05] hover:text-electric focus-visible:outline focus-visible:outline-2 focus-visible:outline-electric">
              <Pause aria-hidden="true" size={18} weight="bold" />
            </button>
          ) : <span aria-hidden="true" className="h-11 w-11" />}
        </div>
      </div>

      <div
        className="mx-auto flex w-full min-w-0 flex-1 flex-col justify-center px-2 py-2 sm:px-3 sm:py-6"
        style={{ maxWidth: `min(720px, calc((100svh - ${phase === "playing" ? 84 : 110}px) * ${ratio}))` }}
      >
        <div
          ref={stageRef}
          tabIndex={-1}
          className={`game-stage relative w-full max-w-full overflow-hidden rounded-[6px] border outline-none [contain:paint] ${midnight ? "border-slate-700 bg-[#0B1020]" : rush ? "border-[#6B5B53] bg-[#343434]" : obby ? "border-[#B9C5D6] bg-[#F6F0E6]" : "border-card-border bg-[#f6f4ef]"}`}
          style={{ aspectRatio: `${width} / ${height}`, touchAction: phase === "playing" ? "none" : "auto" }}
        >
          {children}

          {showHint && phase === "playing" && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center px-4">
              <p className="animate-pulse rounded-full bg-near-black/85 px-4 py-2 text-[13px] font-semibold text-white shadow-lg">{showHint}</p>
            </div>
          )}

          {phase === "ready" && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 text-center ${midnight ? "bg-[#0B1020]/95" : rush ? "bg-[#18203A]/[.88]" : obby ? "bg-[#F6F0E6]/[.76]" : "bg-[#f6f4ef]/92"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-[.2em] ${midnight || rush ? "text-[#F3C969]" : "text-electric"}`}>{title}</p>
              <p className={`mt-3 font-heading text-[26px] font-semibold leading-tight tracking-[-.02em] lg:text-[30px] ${midnight || rush ? "text-[#F8F5EF]" : "text-near-black"}`}>{tagline}</p>
              <p className={`mt-3 max-w-[30ch] text-[14px] leading-[1.5] ${midnight || rush ? "text-[#C8BFB6]" : "text-muted"}`}>{controls}</p>
              {mobileInstructions && mobileInstructions.length > 0 && (
                <div className={`mt-4 w-full max-w-[34ch] rounded-lg border p-3 text-left sm:hidden ${midnight || rush ? "border-white/15 bg-black/15" : "border-card-border bg-white/45"}`}>
                  <p className={`mb-2 text-[10px] font-bold uppercase tracking-[.16em] ${midnight || rush ? "text-[#F3C969]" : "text-electric"}`}>How to play</p>
                  <ol className="space-y-2">
                    {mobileInstructions.slice(0, 3).map((instruction, index) => (
                      <li key={instruction} className={`flex items-start gap-2 text-[12px] leading-[1.35] ${midnight || rush ? "text-[#F8F5EF]" : "text-near-black"}`}>
                        <span className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${midnight || rush ? "bg-[#F3C969] text-[#18203A]" : "bg-electric text-white"}`}>{index + 1}</span>
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <button type="button" autoFocus onClick={() => { tapFeedback(); startGame(); }} disabled={countdown !== null} className={`${primaryButton} mt-6 ${midnight || rush ? "!bg-[#F8F5EF] !text-[#18203A] hover:!bg-[#F3C969]" : ""}`}>
                <Play aria-hidden="true" size={14} weight="fill" />
                {countdown === null ? startLabel : `Starting ${countdown}…`}
              </button>
              {best && <p className={`mt-4 text-[11px] uppercase tracking-[.14em] ${midnight || rush ? "text-[#C8BFB6]" : "text-muted"}`}>{best}</p>}
              {daily ? (
                <div className={`mt-4 flex flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-[.14em] ${midnight || rush ? "text-[#F3C969]" : "text-electric"}`}>
                  <p>{daily.hit ? `Daily challenge complete ✓ · ${daily.label}` : `Today’s challenge · ${daily.label}`}</p>
                  <p className={`text-[9px] font-medium tracking-[.1em] ${midnight || rush ? "text-[#C8BFB6]" : "text-muted"}`}>Same target for every player today · replay anytime</p>
                  {daily.streak > 1 && <p className={midnight || rush ? "text-[#F8F5EF]" : "text-near-black"}>🔥 {daily.streak}-day streak</p>}
                </div>
              ) : challenge && <p className={`mt-3 text-[10px] font-bold uppercase tracking-[.14em] ${midnight || rush ? "text-[#F3C969]" : "text-electric"}`}>Next target · {challenge}</p>}
            </div>
          )}

          {countdown !== null && phase === "ready" && (
            <div aria-live="assertive" className={`absolute inset-0 z-10 flex flex-col items-center justify-center ${midnight || rush ? "bg-[#0B1020]/90 text-[#F8F5EF]" : "bg-[#f6f4ef]/90 text-near-black"}`}>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-electric">Get ready</p>
              <p className="mt-2 font-heading text-[76px] font-semibold leading-none tabular-nums">{countdown}</p>
              <p className="mt-3 text-[12px] uppercase tracking-[.14em] text-muted">{touchHint ?? controls}</p>
            </div>
          )}

          {phase === "paused" && (
            <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 text-center ${midnight ? "bg-[#0B1020]/95" : rush ? "bg-[#18203A]/[.92]" : obby ? "bg-[#F6F0E6]/[.84]" : "bg-[#f6f4ef]/92"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-[.2em] ${midnight || rush ? "text-[#C8BFB6]" : "text-muted"}`}>{rush ? "Run paused" : "Paused"}</p>
              <p className={`mt-2 font-heading text-[24px] font-semibold ${midnight || rush ? "text-[#F8F5EF]" : "text-near-black"}`}>{rush ? "Stay sharp." : "Take your time."}</p>
              <button type="button" autoFocus onClick={onResume} className={`${primaryButton} mt-6 ${midnight || rush ? "!bg-[#F8F5EF] !text-[#18203A] hover:!bg-[#F3C969]" : ""}`}>
                <Play aria-hidden="true" size={14} weight="fill" />
                Resume
              </button>
              <button type="button" onClick={onRestart} className={`${quietButton} mt-2 ${midnight || rush ? "text-[#C8BFB6] hover:text-[#F8F5EF]" : ""}`}>Restart</button>
            </div>
          )}

          {phase === "result" && (
            // The game world stays faintly visible behind its own result.
            <div className={`absolute inset-0 flex items-center justify-center overflow-hidden px-6 py-6 ${midnight ? "bg-[#0B1020]/[.84]" : rush ? "bg-gradient-to-b from-[#18203A]/[.78] via-[#2B2340]/[.86] to-[#3A2A3F]/[.94]" : obby ? "bg-[#FBF5EA]/[.86]" : "bg-[#f6f4ef]/95"}`}>{result}</div>
          )}
        </div>

        {phase === "result" ? after : phase !== "ready" && <p className="mt-3 hidden text-center text-[12px] leading-[1.5] text-muted sm:block">{controls}</p>}
      </div>
      <div className="game-rotate-hint fixed inset-0 z-20 hidden flex-col items-center justify-center gap-2 bg-background px-8 text-center">
        <p className="font-heading text-[20px] font-semibold text-near-black">Turn your phone upright</p>
        <p className="text-[14px] text-muted">{title} plays best in portrait.</p>
      </div>
      <p aria-live="polite" className="sr-only">{announcement}</p>
    </div>
  );
}
