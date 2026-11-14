"use client";

// Browser-side handle on the shared inference worker. One worker per tab, one
// language model at a time, one generation at a time. Nothing in this file
// can reach a hosted model: if local inference fails, callers get an error.

import { useSyncExternalStore } from "react";
import { EMBEDDING_MODEL, LLM_MODELS, planModel, type DeviceReport, type LlmKey } from "./models";
import type { ChatMessage, WorkerRequest, WorkerResponse } from "./protocol";

export type LlmPhase = "idle" | "downloading" | "ready" | "generating" | "error";
export type LlmState = {
  phase: LlmPhase;
  model: LlmKey | null;
  device: "webgpu" | "wasm" | null;
  dtype: string | null;
  /** Download progress 0–1, or null when unknown. */
  progress: number | null;
  loadedMb: number;
  error: string;
};

let state: LlmState = { phase: "idle", model: null, device: null, dtype: null, progress: null, loadedMb: 0, error: "" };
const listeners = new Set<() => void>();
function setState(patch: Partial<LlmState>) { state = { ...state, ...patch }; listeners.forEach((fn) => fn()); }
const subscribe = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
const SERVER_STATE = state;

export function useLlmState() {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

let worker: Worker | null = null;
let nextId = 1;
const handlers = new Map<number, (message: WorkerResponse) => void>();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./llm.worker.ts", import.meta.url), { type: "module" });
    worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => handlers.get(event.data.id)?.(event.data));
    worker.addEventListener("error", () => {
      for (const handler of handlers.values()) handler({ id: 0, type: "error", message: "The on-device AI worker crashed. This usually means the device ran out of memory." });
      handlers.clear();
      worker?.terminate();
      worker = null;
      setState({ phase: "error", model: null, device: null, error: "The on-device AI stopped unexpectedly (often out of memory). Try the Light model or close other tabs." });
    });
  }
  return worker;
}

type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

function request(message: WithoutId<WorkerRequest>, onMessage: (message: WorkerResponse) => boolean | void) {
  const id = nextId++;
  return new Promise<WorkerResponse>((resolve, reject) => {
    handlers.set(id, (response) => {
      if (response.type === "error") { handlers.delete(id); reject(new Error(response.message)); return; }
      if (onMessage(response)) { handlers.delete(id); resolve(response); }
    });
    getWorker().postMessage({ ...message, id } as WorkerRequest);
  });
}

let reportPromise: Promise<DeviceReport> | null = null;

/** Probe WebGPU and device hints once per tab. Never throws. */
export function detectDevice(): Promise<DeviceReport> {
  if (!reportPromise) reportPromise = (async () => {
    const nav = navigator as Navigator & { gpu?: { requestAdapter: (o?: unknown) => Promise<{ features: Set<string>; limits: { maxBufferSize: number } } | null> }; deviceMemory?: number; userAgentData?: { mobile: boolean } };
    const notes: string[] = [];
    let webgpu = false;
    let shaderF16 = false;
    let maxBufferMb: number | null = null;
    try {
      const adapter = nav.gpu ? await nav.gpu.requestAdapter({ powerPreference: "high-performance" }) : null;
      if (adapter) {
        webgpu = true;
        shaderF16 = adapter.features.has("shader-f16");
        maxBufferMb = Math.round(adapter.limits.maxBufferSize / 1024 / 1024);
      }
    } catch { /* treated as no WebGPU */ }
    if (!webgpu) notes.push("WebGPU isn't available, so models run on the CPU (much slower).");
    const mobile = nav.userAgentData?.mobile ?? /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    if (mobile) notes.push("On phones, use the Light model and keep texts short. Large downloads may be evicted by the browser.");
    return { webgpu, shaderF16, maxBufferMb, memoryGb: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null, cores: navigator.hardwareConcurrency || null, mobile, workers: typeof Worker !== "undefined", notes };
  })();
  return reportPromise;
}

/** Download (or reuse from cache) and initialise a model. */
export async function loadModel(key: LlmKey) {
  const model = LLM_MODELS[key];
  const plan = planModel(model, await detectDevice());
  if ("unavailable" in plan) { setState({ phase: "error", error: plan.unavailable }); throw new Error(plan.unavailable); }
  if (state.model === key && (state.phase === "ready" || state.phase === "generating")) return;
  setState({ phase: "downloading", model: key, device: plan.device, dtype: plan.dtype, progress: 0, loadedMb: 0, error: "" });
  try {
    await request({ type: "load", repo: model.repo, dtype: plan.dtype, device: plan.device }, (message) => {
      if (message.type === "progress") setState({ progress: message.total ? message.loaded / message.total : null, loadedMb: Math.round(message.loaded / 1e6) });
      return message.type === "ready";
    });
    setState({ phase: "ready", progress: 1 });
  } catch (caught) {
    const error = describeLoadError(caught);
    setState({ phase: "error", model: null, error });
    throw new Error(error);
  }
}

function describeLoadError(caught: unknown) {
  const text = caught instanceof Error ? caught.message : String(caught);
  console.warn("[on-device AI] model load failed:", text);
  if (/quota|storage/i.test(text)) return "Your browser ran out of storage space for the model files. Free up space or use the Light model.";
  if (/fetch|network|Failed to load/i.test(text)) return "The model files couldn't be downloaded. Check your connection and try again.";
  if (/memory|allocation|OOM/i.test(text)) return "This device ran out of memory loading the model. Try the Light model or close other tabs.";
  return `The model couldn't start on this device (${text.slice(0, 140)}).`;
}

export type GenerateOptions = { maxNewTokens?: number; temperature?: number; repetitionPenalty?: number; onToken?: (text: string) => void };
export type GenerateResult = { text: string; interrupted: boolean };

export class InputTooLongError extends Error {}

/** Run one prompt. Rejects on failure; never returns invented text. */
export async function generate(messages: ChatMessage[], options: GenerateOptions = {}): Promise<GenerateResult> {
  if (!state.model || state.phase !== "ready") throw new Error("Load a model first.");
  const model = LLM_MODELS[state.model];
  setState({ phase: "generating" });
  try {
    const response = await request({ type: "generate", messages, maxNewTokens: options.maxNewTokens ?? 512, maxInputTokens: model.maxInputTokens, temperature: options.temperature ?? 0, repetitionPenalty: options.repetitionPenalty }, (message) => {
      if (message.type === "token") options.onToken?.(message.text);
      return message.type === "done";
    });
    const done = response as Extract<WorkerResponse, { type: "done" }>;
    return { text: done.text, interrupted: Boolean(done.interrupted) };
  } catch (caught) {
    const text = caught instanceof Error ? caught.message : "";
    if (text.startsWith("INPUT_TOO_LONG")) throw new InputTooLongError("That text is too long for the on-device model in one go. Select a shorter part.");
    throw caught instanceof Error ? caught : new Error("Generation failed.");
  } finally {
    if ((state.phase as LlmPhase) === "generating") setState({ phase: "ready" });
  }
}

export function cancelGeneration() { worker?.postMessage({ id: 0, type: "interrupt" } satisfies WorkerRequest); }

/** Free the model's memory (weights stay in the browser cache). */
export async function unloadModel() {
  if (!worker) return;
  cancelGeneration();
  // Terminating is the only reliable way to return WebGPU/WASM memory.
  worker.terminate();
  worker = null;
  handlers.clear();
  setState({ phase: "idle", model: null, device: null, dtype: null, progress: null, loadedMb: 0, error: "" });
}

/** Sentence embeddings with all-MiniLM-L6-v2 (normalised, mean-pooled). */
export async function embed(texts: string[], onProgress?: (done: number, total: number) => void): Promise<number[][]> {
  const response = await request({ type: "embed", repo: EMBEDDING_MODEL.repo, dtype: EMBEDDING_MODEL.dtype, texts }, (message) => {
    if (message.type === "progress" && message.phase === "embedding") onProgress?.(message.loaded, message.total);
    return message.type === "vectors";
  });
  return (response as Extract<WorkerResponse, { type: "vectors" }>).vectors;
}

/** Remove cached model files from the Cache API (Transformers.js cache). */
export async function clearModelCache() {
  await unloadModel();
  if (typeof caches !== "undefined") await caches.delete("transformers-cache");
}
