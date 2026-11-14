export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type WorkerRequest =
  | { id: number; type: "load"; repo: string; dtype: string; device: string }
  | { id: number; type: "generate"; messages: ChatMessage[]; maxNewTokens: number; maxInputTokens: number; temperature: number; repetitionPenalty?: number }
  | { id: number; type: "embed"; repo: string; dtype: string; texts: string[] }
  | { id: number; type: "interrupt" }
  | { id: number; type: "unload" };

export type WorkerResponse =
  | { id: number; type: "progress"; loaded: number; total: number; phase?: "embedding" }
  | { id: number; type: "ready" }
  | { id: number; type: "token"; text: string }
  | { id: number; type: "done"; text: string; interrupted?: boolean; promptTokens?: number }
  | { id: number; type: "vectors"; vectors: number[][] }
  | { id: number; type: "error"; message: string };
