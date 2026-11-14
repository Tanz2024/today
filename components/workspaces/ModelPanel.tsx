"use client";

import { useEffect, useState } from "react";
import { Cpu, DownloadSimple, Power, ShieldCheck, WarningCircle } from "@phosphor-icons/react";
import { ProgressBar } from "@/components/tools/local/Dropzone";
import { detectDevice, loadModel, unloadModel, useLlmState } from "@/lib/local-llm/client";
import { LLM_MODELS, planModel, recommendedModel, type DeviceReport, type LlmKey } from "@/lib/local-llm/models";

/**
 * The one place a visitor sees, chooses and starts the on-device model.
 * Nothing downloads until they press Load. `purpose` names what it's for.
 */
export default function ModelPanel({ purpose }: { purpose: string }) {
  const llm = useLlmState();
  const [report, setReport] = useState<DeviceReport | null>(null);
  const [choice, setChoice] = useState<LlmKey>("qwen3.5-0.8b");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let live = true;
    void detectDevice().then((value) => { if (!live) return; setReport(value); setChoice(recommendedModel(value)); });
    return () => { live = false; };
  }, []);

  const busy = llm.phase === "downloading" || llm.phase === "generating";
  const loaded = (llm.phase === "ready" || llm.phase === "generating") && llm.model;

  async function start() {
    setLoadError("");
    try { await loadModel(choice); } catch (caught) { setLoadError(caught instanceof Error ? caught.message : "The model couldn't start."); }
  }

  return (
    <section className="ws-model" aria-labelledby="ws-model-title">
      <div className="ws-model-head">
        <h2 id="ws-model-title"><Cpu size={18} weight="bold" aria-hidden="true" /> On-device AI</h2>
        {loaded ? <span className="d-badge d-badge-quiet">{LLM_MODELS[llm.model!].label} · {llm.device === "webgpu" ? "GPU (WebGPU)" : "CPU (WebAssembly)"}</span> : <span className="d-badge d-badge-quiet">Not loaded</span>}
      </div>
      <p className="ws-model-copy"><ShieldCheck size={16} weight="bold" aria-hidden="true" /> {purpose} runs in this browser tab. Your text is never sent to TodayAI or an AI service. The model files are downloaded once from Hugging Face and then cached on this device.</p>

      {!loaded ? (
        <>
          <fieldset className="ws-model-choices" disabled={busy}>
            <legend className="sr-only">Choose a model</legend>
            {(Object.keys(LLM_MODELS) as LlmKey[]).map((key) => {
              const model = LLM_MODELS[key];
              const plan = report ? planModel(model, report) : null;
              const blocked = plan && "unavailable" in plan ? plan.unavailable : "";
              return (
                <label key={key} className={`ws-model-choice ${choice === key ? "is-active" : ""} ${blocked ? "is-blocked" : ""}`}>
                  <input type="radio" name="llm" value={key} checked={choice === key} disabled={Boolean(blocked)} onChange={() => setChoice(key)} className="sr-only" />
                  <strong>{model.label}</strong>
                  <span>{plan && "downloadMb" in plan ? `≈ ${plan.downloadMb >= 1000 ? `${(plan.downloadMb / 1000).toFixed(1)} GB` : `${plan.downloadMb} MB`} download · needs ≈ ${model.memoryGb} GB memory` : report ? "" : "Checking this device…"}</span>
                  <span className="ws-muted">{blocked || model.summary}</span>
                </label>
              );
            })}
          </fieldset>
          {report?.notes.length ? <ul className="ws-notes">{report.notes.map((note) => <li key={note}>{note}</li>)}</ul> : null}
          {llm.phase === "downloading" ? (
            <ProgressBar label={`Downloading and starting ${LLM_MODELS[llm.model ?? choice].label}${llm.loadedMb ? ` · ${llm.loadedMb} MB` : ""} (first time only; later loads use the cache)`} value={llm.progress} />
          ) : (
            <div className="utility-buttons ws-start">
              <button type="button" className="ui-button ui-button-primary" onClick={start} disabled={!report || busy}><DownloadSimple size={16} weight="bold" aria-hidden="true" /> Load {LLM_MODELS[choice].label.split(" · ")[0]}</button>
            </div>
          )}
        </>
      ) : (
        <div className="utility-actions">
          <p className="utility-count">{llm.phase === "generating" ? "Working on your request…" : "Ready. Processing stays on this device."}</p>
          <div className="utility-buttons"><button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => void unloadModel()}><Power size={15} aria-hidden="true" /> Unload &amp; free memory</button></div>
        </div>
      )}
      {loadError || (llm.phase === "error" && llm.error) ? <p className="utility-error" role="alert"><WarningCircle size={16} weight="bold" aria-hidden="true" /> {loadError || llm.error} The tools below that don&apos;t need AI still work.</p> : null}
    </section>
  );
}
