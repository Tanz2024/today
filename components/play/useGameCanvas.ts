"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

// The longest frame we simulate. After a tab switch or a slow frame the game
// advances at most this much, so nothing teleports through walls.
export const MAX_FRAME_SECONDS = 1 / 20;

type Options = {
  width: number;
  height: number;
  running: boolean;
  onFrame: (dt: number) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
};

// Owns the canvas size, device-pixel scaling and a single rAF loop. Game
// state lives in refs owned by the caller; React never re-renders per frame.
export function useGameCanvas({ width, height, running, onFrame, draw }: Options) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onFrameRef = useRef(onFrame);
  const drawRef = useRef(draw);
  const scaleRef = useRef(1);

  useLayoutEffect(() => {
    onFrameRef.current = onFrame;
    drawRef.current = draw;
  });

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = canvas.width / Math.max(1, canvas.clientWidth);
    ctx.setTransform(dpr * scaleRef.current, 0, 0, dpr * scaleRef.current, 0, 0);
    drawRef.current(ctx);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const cssWidth = canvas.clientWidth;
      if (!cssWidth) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssWidth * (height / width) * dpr);
      scaleRef.current = cssWidth / width;
      render();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [width, height, render]);

  useEffect(() => {
    if (!running) {
      render();
      return;
    }
    let frame = 0;
    let last = performance.now();
    const tick = (time: number) => {
      const dt = Math.min(MAX_FRAME_SECONDS, Math.max(0, (time - last) / 1000));
      last = time;
      onFrameRef.current(dt);
      render();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, render]);

  // Converts a pointer event into game coordinates.
  const toGamePoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return { x: 0, y: 0 };
    return { x: ((clientX - rect.left) / rect.width) * width, y: ((clientY - rect.top) / rect.height) * height };
  }, [width, height]);

  return { canvasRef, render, toGamePoint };
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
