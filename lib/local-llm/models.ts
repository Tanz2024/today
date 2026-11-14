// Registry of the open-weight models the workspaces may run in the browser.
// Every entry was checked against its Hugging Face repo (license, ONNX files,
// sizes) and against the installed @huggingface/transformers (4.3.1), which
// maps model_type "qwen3_5" to Qwen3_5ForCausalLM and loads only the
// embed_tokens + decoder_model_merged sessions for text generation (the
// vision encoder is never downloaded).
//
// Sizes are the sum of the ONNX weight files + tokenizer for the chosen
// quantisation, rounded. Nothing here talks to a hosted inference service:
// huggingface.co is used only as a static file host for the weights.

export type LlmKey = "qwen3.5-0.8b" | "qwen3.5-2b";
export type LlmDtype = "q4f16" | "q4";
export type LlmDevice = "webgpu" | "wasm";

export type LlmModel = {
  key: LlmKey;
  repo: string;
  label: string;
  summary: string;
  license: string;
  /** Approximate download in MB for each quantisation. */
  downloadMb: Record<LlmDtype, number>;
  /** Rough peak memory needed while generating, in GB. */
  memoryGb: number;
  /** Devices it is offered on. 2B on CPU/WASM is too slow to be useful. */
  devices: LlmDevice[];
  /** Tokens of prompt we allow per request (well under the native context). */
  maxInputTokens: number;
};

export const LLM_MODELS: Record<LlmKey, LlmModel> = {
  "qwen3.5-0.8b": {
    key: "qwen3.5-0.8b",
    repo: "onnx-community/Qwen3.5-0.8B-ONNX",
    label: "Qwen3.5 0.8B · Light",
    summary: "Smaller download; works on more devices including recent phones. Fine for grammar fixes and short rewrites.",
    license: "Apache-2.0",
    downloadMb: { q4f16: 600, q4: 665 },
    memoryGb: 1.5,
    devices: ["webgpu", "wasm"],
    maxInputTokens: 1_800,
  },
  "qwen3.5-2b": {
    key: "qwen3.5-2b",
    repo: "onnx-community/Qwen3.5-2B-ONNX",
    label: "Qwen3.5 2B · Quality",
    summary: "Noticeably better rewriting and answers. Needs a desktop or laptop GPU with WebGPU.",
    license: "Apache-2.0",
    downloadMb: { q4f16: 1_400, q4: 1_550 },
    memoryGb: 3,
    devices: ["webgpu"],
    maxInputTokens: 2_400,
  },
};

/** Shared with AI Word Detective, so a visitor who played it has it cached. */
export const EMBEDDING_MODEL = { repo: "Xenova/all-MiniLM-L6-v2", dtype: "q8" as const, downloadMb: 23, license: "Apache-2.0" };

export type DeviceReport = {
  webgpu: boolean;
  shaderF16: boolean;
  /** navigator.deviceMemory (Chromium only), GB. */
  memoryGb: number | null;
  cores: number | null;
  mobile: boolean;
  /** Largest single GPU buffer, MB (null without WebGPU). */
  maxBufferMb: number | null;
  workers: boolean;
  notes: string[];
};

export type ModelPlan = { device: LlmDevice; dtype: LlmDtype; downloadMb: number } | { unavailable: string };

/** Pick device and quantisation for a model on this browser, or say why not. */
export function planModel(model: LlmModel, report: DeviceReport): ModelPlan {
  if (!report.workers) return { unavailable: "This browser can't run Web Workers, which on-device AI needs." };
  if (report.webgpu && model.devices.includes("webgpu")) {
    const dtype: LlmDtype = report.shaderF16 ? "q4f16" : "q4";
    // A 2B q4 decoder has ~1.2 GB of weights; small GPU buffers can't hold its shards.
    if (model.key === "qwen3.5-2b" && report.maxBufferMb !== null && report.maxBufferMb < 1024) return { unavailable: "Your GPU reports buffers too small for the 2B model. Use the Light model." };
    if (model.key === "qwen3.5-2b" && report.memoryGb !== null && report.memoryGb < 4) return { unavailable: "This device reports under 4 GB of memory. Use the Light model." };
    return { device: "webgpu", dtype, downloadMb: model.downloadMb[dtype] };
  }
  if (!model.devices.includes("wasm")) return { unavailable: "Needs WebGPU, which this browser doesn't offer. Try the Light model, or Chrome/Edge on a desktop." };
  if (report.memoryGb !== null && report.memoryGb < 2) return { unavailable: "This device reports under 2 GB of memory, which isn't enough to run a language model." };
  return { device: "wasm", dtype: "q4", downloadMb: model.downloadMb.q4 };
}

/** Recommended default: Quality on capable desktops, otherwise Light. */
export function recommendedModel(report: DeviceReport): LlmKey {
  const quality = planModel(LLM_MODELS["qwen3.5-2b"], report);
  return !report.mobile && "device" in quality ? "qwen3.5-2b" : "qwen3.5-0.8b";
}
