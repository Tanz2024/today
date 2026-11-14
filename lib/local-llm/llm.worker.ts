/// <reference lib="webworker" />
// The one on-device inference worker shared by the Writing, Resume and Study
// workspaces. It holds at most one language model and one embedding model.
// Loading a different language model disposes the previous one first, so a
// tab never keeps two LLM sessions in memory.

import { AutoModelForCausalLM, AutoTokenizer, InterruptableStoppingCriteria, TextStreamer, env, pipeline } from "@huggingface/transformers";
import type { WorkerRequest, WorkerResponse } from "./protocol";

env.allowLocalModels = false;
// Browser Cache API: the weights are downloaded once and reused across visits.
env.useBrowserCache = true;

type Tok = Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;
type Model = Awaited<ReturnType<typeof AutoModelForCausalLM.from_pretrained>>;
type Extractor = (texts: string[], options: Record<string, unknown>) => Promise<{ tolist: () => number[][] }>;

let llm: { repo: string; dtype: string; device: string; tokenizer: Tok; model: Model } | null = null;
let loading: Promise<void> | null = null;
let embedder: Promise<Extractor> | null = null;
const stopping = new InterruptableStoppingCriteria();
let busy = false;

const post = (message: WorkerResponse) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);

function progressReporter(id: number) {
  const files = new Map<string, { loaded: number; total: number }>();
  return (event: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (event.status !== "progress" || !event.file || !event.total) return;
    files.set(event.file, { loaded: event.loaded ?? 0, total: event.total });
    let loaded = 0;
    let total = 0;
    for (const f of files.values()) { loaded += f.loaded; total += f.total; }
    post({ id, type: "progress", loaded, total });
  };
}

async function disposeLlm() {
  const current = llm;
  llm = null;
  if (current) await (current.model as unknown as { dispose: () => Promise<void> }).dispose().catch(() => {});
}

async function load(id: number, repo: string, dtype: string, device: string) {
  if (llm && llm.repo === repo && llm.dtype === dtype && llm.device === device) return;
  if (loading) await loading.catch(() => {});
  await disposeLlm();
  const progress_callback = progressReporter(id);
  loading = (async () => {
    const tokenizer = await AutoTokenizer.from_pretrained(repo, { progress_callback });
    const model = await AutoModelForCausalLM.from_pretrained(repo, { dtype: dtype as "q4", device: device as "webgpu", progress_callback });
    llm = { repo, dtype, device, tokenizer, model };
  })();
  try { await loading; } finally { loading = null; }
}

/** Qwen sometimes echoes our delimiters or opens a think block; strip both. */
function clean(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/^\s*<think>[\s\S]*$/, "").replace(/<\/?(text|passage|source)>/g, "").trim();
}

self.addEventListener("message", async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === "interrupt") { stopping.interrupt(); return; }
    if (message.type === "unload") {
      await disposeLlm();
      post({ id: message.id, type: "done", text: "" });
      return;
    }
    if (message.type === "load") {
      await load(message.id, message.repo, message.dtype, message.device);
      post({ id: message.id, type: "ready" });
      return;
    }
    if (message.type === "generate") {
      if (!llm) throw new Error("No model is loaded.");
      if (busy) throw new Error("The model is already working on another request.");
      busy = true;
      stopping.reset();
      try {
        const { tokenizer, model } = llm;
        const inputs = tokenizer.apply_chat_template(message.messages, { add_generation_prompt: true, return_dict: true, enable_thinking: false } as never) as unknown as { input_ids: { dims: number[] } };
        const promptTokens = inputs.input_ids.dims.at(-1) ?? 0;
        if (promptTokens > message.maxInputTokens) throw new Error(`INPUT_TOO_LONG:${promptTokens}`);
        let streamed = "";
        const streamer = new TextStreamer(tokenizer, {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: (chunk: string) => { streamed += chunk; post({ id: message.id, type: "token", text: chunk }); },
        });
        const output = (await model.generate({
          ...inputs,
          max_new_tokens: message.maxNewTokens,
          do_sample: message.temperature > 0,
          ...(message.temperature > 0 ? { temperature: message.temperature, top_p: 0.8, top_k: 20 } : {}),
          repetition_penalty: message.repetitionPenalty ?? 1,
          streamer,
          stopping_criteria: stopping,
        } as never)) as { slice: (...args: unknown[]) => unknown };
        const decoded = tokenizer.batch_decode(output.slice(null, [promptTokens, null]) as never, { skip_special_tokens: true })[0] ?? streamed;
        post({ id: message.id, type: "done", text: clean(decoded), interrupted: stopping.interrupted, promptTokens });
      } finally {
        busy = false;
      }
      return;
    }
    if (message.type === "embed") {
      if (!embedder) {
        embedder = pipeline("feature-extraction", message.repo, { dtype: message.dtype as "q8", progress_callback: progressReporter(message.id) }) as unknown as Promise<Extractor>;
        embedder.catch(() => { embedder = null; });
      }
      const extractor = await embedder;
      const vectors: number[][] = [];
      for (let i = 0; i < message.texts.length; i += 16) {
        const batch = await extractor(message.texts.slice(i, i + 16), { pooling: "mean", normalize: true });
        vectors.push(...batch.tolist());
        post({ id: message.id, type: "progress", loaded: Math.min(i + 16, message.texts.length), total: message.texts.length, phase: "embedding" });
      }
      post({ id: message.id, type: "vectors", vectors });
    }
  } catch (caught) {
    post({ id: message.id, type: "error", message: caught instanceof Error ? caught.message : String(caught) });
  }
});
