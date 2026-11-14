"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, DownloadSimple, Eraser, Microphone, Stop, Waveform } from "@phosphor-icons/react";
import Dropzone, { ProgressBar, downloadText } from "./Dropzone";
import { AUDIO_MAX_BYTES, AUDIO_MAX_SECONDS } from "@/lib/local-ai-tools";

const MODELS = {
  fast: { id: "Xenova/whisper-tiny", label: "Fast", size: "about 41 MB" },
  accurate: { id: "Xenova/whisper-base", label: "Accurate", size: "about 77 MB" },
} as const;
type ModelKey = keyof typeof MODELS;
type Chunk = { timestamp: [number, number | null]; text: string };
type Transcriber = (audio: Float32Array, options: Record<string, unknown>) => Promise<{ text: string; chunks?: Chunk[] }>;

const loaded = new Map<ModelKey, Promise<Transcriber>>();

function loadModel(key: ModelKey, onProgress: (value: number) => void) {
  if (!loaded.has(key)) {
    const files = new Map<string, { loaded: number; total: number }>();
    const promise = import("@huggingface/transformers").then(async ({ pipeline, env }) => {
      // Run ONNX inference in a worker so the page stays responsive.
      if (env.backends.onnx?.wasm) env.backends.onnx.wasm.proxy = true;
      return (await pipeline("automatic-speech-recognition", MODELS[key].id, {
        dtype: "q8",
        progress_callback: (event: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (event.status !== "progress" || !event.file || !event.total) return;
          files.set(event.file, { loaded: event.loaded ?? 0, total: event.total });
          const all = [...files.values()];
          onProgress(all.reduce((sum, f) => sum + f.loaded, 0) / all.reduce((sum, f) => sum + f.total, 0));
        },
      })) as unknown as Transcriber;
    });
    promise.catch(() => loaded.delete(key));
    loaded.set(key, promise);
  }
  return loaded.get(key)!;
}

/** Decode any browser-supported audio to 16 kHz mono, as Whisper expects. */
async function decodeAudio(blob: Blob) {
  const context = new AudioContext({ sampleRate: 16_000 });
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    if (buffer.numberOfChannels === 1) return { samples: buffer.getChannelData(0), seconds: buffer.duration };
    const mono = new Float32Array(buffer.length);
    for (let c = 0; c < buffer.numberOfChannels; c += 1) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i += 1) mono[i] += data[i] / buffer.numberOfChannels;
    }
    return { samples: mono, seconds: buffer.duration };
  } finally {
    void context.close();
  }
}

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function SpeechToText() {
  const [audio, setAudio] = useState<{ blob: Blob; name: string; url: string } | null>(null);
  const [modelKey, setModelKey] = useState<ModelKey>("fast");
  const [language, setLanguage] = useState<"english" | "auto">("english");
  const [status, setStatus] = useState<"idle" | "recording" | "working" | "done" | "error">("idle");
  const [progress, setProgress] = useState<{ label: string; value: number | null }>({ label: "", value: null });
  const [transcript, setTranscript] = useState("");
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);
  useEffect(() => () => { if (audio) URL.revokeObjectURL(audio.url); }, [audio]);

  function fail(message: string) { setError(message); setStatus("error"); }

  function takeBlob(blob: Blob, name: string) {
    setAudio({ blob, name, url: URL.createObjectURL(blob) });
    setTranscript("");
    setChunks([]);
    setError("");
    setStatus("idle");
  }

  function choose(file: File) {
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) return fail("Please choose an audio file such as MP3, M4A, WAV, OGG or WebM.");
    if (file.size > AUDIO_MAX_BYTES) return fail(`That file is larger than ${AUDIO_MAX_BYTES / 1024 / 1024} MB.`);
    takeBlob(file, file.name);
  }

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return fail("Recording isn't supported in this browser. You can upload an audio file instead.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const parts: Blob[] = [];
      const media = new MediaRecorder(stream);
      media.ondataavailable = (event) => { if (event.data.size) parts.push(event.data); };
      media.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timer.current) clearInterval(timer.current);
        takeBlob(new Blob(parts, { type: media.mimeType || "audio/webm" }), "recording");
      };
      recorder.current = media;
      media.start();
      setElapsed(0);
      setStatus("recording");
      const started = Date.now();
      timer.current = window.setInterval(() => {
        const seconds = (Date.now() - started) / 1000;
        setElapsed(seconds);
        if (seconds >= AUDIO_MAX_SECONDS) media.stop();
      }, 250);
    } catch {
      fail("Microphone access was blocked or no microphone was found. Allow access in your browser, or upload a file instead.");
    }
  }

  async function run() {
    if (!audio) return;
    setStatus("working");
    setError("");
    try {
      setProgress({ label: "Decoding audio", value: null });
      const { samples, seconds } = await decodeAudio(audio.blob).catch(() => { throw new Error("decode"); });
      if (seconds > AUDIO_MAX_SECONDS + 1) return fail(`That recording is ${Math.round(seconds / 60)} minutes long. Please use audio under ${AUDIO_MAX_SECONDS / 60} minutes.`);
      const label = `Downloading ${MODELS[modelKey].label.toLowerCase()} model (${MODELS[modelKey].size}, first time only)`;
      setProgress({ label, value: 0 });
      const transcriber = await loadModel(modelKey, (value) => setProgress({ label, value }));
      setProgress({ label: `Transcribing ${clock(seconds)} of audio — this can take a while`, value: null });
      const output = await transcriber(samples, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        task: "transcribe",
        ...(language === "english" ? { language: "english" } : {}),
      });
      const text = output.text.trim();
      if (!text) return fail("No speech was recognised. Check the recording has audible speech and try again.");
      setTranscript(text);
      setChunks((output.chunks ?? []).filter((chunk) => chunk.text.trim()));
      setStatus("done");
    } catch (caught) {
      fail(caught instanceof Error && caught.message === "decode" ? "That audio couldn't be decoded by your browser. Try MP3, WAV or M4A." : "Transcription failed. Check your connection (the model downloads on first use) and try again.");
    }
  }

  function clear() {
    setAudio(null);
    setTranscript("");
    setChunks([]);
    setError("");
    setStatus("idle");
  }

  async function copy() {
    try { await navigator.clipboard.writeText(transcript); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* selectable */ }
  }

  const timestamped = chunks.map((chunk) => `[${clock(chunk.timestamp[0])} → ${clock(chunk.timestamp[1] ?? chunk.timestamp[0])}] ${chunk.text.trim()}`).join("\n");
  const busy = status === "working" || status === "recording";

  return (
    <div className="utility-panel lt-panel">
      <div className="lt-settings">
        <fieldset className="utility-options">
          <legend>Model</legend>
          {(Object.keys(MODELS) as ModelKey[]).map((key) => (
            <label key={key} className={`utility-chip ${modelKey === key ? "is-active" : ""}`}>
              <input type="radio" name="model" className="sr-only" checked={modelKey === key} onChange={() => setModelKey(key)} disabled={busy} />
              {MODELS[key].label} <span className="lt-meta">{MODELS[key].size}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="utility-options">
          <legend>Language</legend>
          <label className={`utility-chip ${language === "english" ? "is-active" : ""}`}><input type="radio" name="lang" className="sr-only" checked={language === "english"} onChange={() => setLanguage("english")} disabled={busy} />English</label>
          <label className={`utility-chip ${language === "auto" ? "is-active" : ""}`}><input type="radio" name="lang" className="sr-only" checked={language === "auto"} onChange={() => setLanguage("auto")} disabled={busy} />Detect (accuracy varies)</label>
        </fieldset>
      </div>

      {status === "recording" ? (
        <div className="lt-recording" role="status">
          <span className="lt-rec-dot" aria-hidden="true" /> Recording {clock(elapsed)} <span className="lt-meta">/ max {clock(AUDIO_MAX_SECONDS)}</span>
          <button type="button" className="ui-button ui-button-primary" onClick={() => recorder.current?.stop()}><Stop size={16} weight="fill" aria-hidden="true" /> Stop</button>
        </div>
      ) : !audio ? (
        <div className="lt-audio-pick">
          <Dropzone accept="audio/*,video/webm,video/mp4" label="Upload audio" hint={`MP3, M4A, WAV, OGG, WebM · up to ${AUDIO_MAX_SECONDS / 60} min`} onFile={choose} />
          <button type="button" className="ui-button ui-button-ghost lt-record" onClick={startRecording}><Microphone size={18} weight="bold" aria-hidden="true" /> Record with microphone</button>
        </div>
      ) : (
        <div className="lt-audio">
          <audio controls src={audio.url} />
          <span className="lt-meta">{audio.name}</span>
        </div>
      )}

      {status === "working" ? <ProgressBar label={progress.label} value={progress.value} /> : null}
      {status === "error" ? <p className="utility-error" role="alert">{error}</p> : null}
      {transcript ? (
        <>
          <label htmlFor="stt-text" className="utility-label">Transcript <span className="lt-meta">· editable</span></label>
          <textarea id="stt-text" className="utility-textarea" rows={10} value={transcript} onChange={(event) => setTranscript(event.target.value)} />
        </>
      ) : null}

      <div className="utility-actions">
        <p className="utility-count">Runs in your browser · audio is not uploaded</p>
        <div className="utility-buttons">
          <button type="button" className="ui-button ui-button-ghost" onClick={clear} disabled={!audio || busy}><Eraser size={16} aria-hidden="true" /> Clear</button>
          {transcript ? <button type="button" className="ui-button ui-button-ghost" onClick={copy}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copied ? "Copied" : "Copy"}</button> : null}
          {transcript ? <button type="button" className="ui-button ui-button-ghost" onClick={() => downloadText("transcript.txt", transcript)}><DownloadSimple size={16} aria-hidden="true" /> .txt</button> : null}
          {timestamped ? <button type="button" className="ui-button ui-button-ghost" onClick={() => downloadText("transcript-timestamped.txt", timestamped)}><DownloadSimple size={16} aria-hidden="true" /> Timestamped</button> : null}
          <button type="button" className="ui-button ui-button-primary" onClick={run} disabled={!audio || busy}><Waveform size={16} weight="bold" aria-hidden="true" /> {status === "working" ? "Transcribing…" : "Transcribe"}</button>
        </div>
      </div>
    </div>
  );
}
