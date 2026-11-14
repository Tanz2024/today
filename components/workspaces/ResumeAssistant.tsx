"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, DownloadSimple, MagicWand, Plus, Printer, Stop, Trash, WarningCircle, X } from "@phosphor-icons/react";
import ModelPanel from "./ModelPanel";
import DiffView from "./DiffView";
import { cancelGeneration, generate, useLlmState } from "@/lib/local-llm/client";
import { STORAGE_KEY, emptyEducation, emptyExperience, emptyResume, isResume, newId, resumeText, skillList, type Resume } from "@/lib/resume/model";
import { matchTerms } from "@/lib/resume/keywords";
import { bulletMessages, coverLetterMessages, summaryMessages } from "@/lib/resume/prompts";
import { addedNames, addedProtected, describeItems } from "@/lib/text/guard";
import { cleanRewrite } from "@/lib/writing/modes";
import { applyFixes, lintText } from "@/lib/text/lint";
import { copyText, downloadFile, textToHtmlDocument } from "@/lib/workspace-files";

type Tab = "edit" | "match" | "letter" | "preview";
type Suggestion = { key: string; original: string; output: string; warning: string; apply: (text: string) => void };

function useSaved(cv: Resume, save: boolean) {
  useEffect(() => {
    if (!save) return;
    const timer = window.setTimeout(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cv)); } catch { /* storage blocked */ } }, 400);
    return () => window.clearTimeout(timer);
  }, [cv, save]);
}

export default function ResumeAssistant() {
  const llm = useLlmState();
  const ready = llm.phase === "ready" || llm.phase === "generating";
  const [cv, setCv] = useState<Resume>(emptyResume);
  const [save, setSave] = useState(false);
  const [tab, setTab] = useState<Tab>("edit");
  const [job, setJob] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState("");
  const [letter, setLetter] = useState({ company: "", role: "", tone: "professional", text: "", warning: "" });
  const [live, setLive] = useState("");
  const [template, setTemplate] = useState<"classic" | "modern">("classic");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from this device
      if (isResume(parsed)) { setCv(parsed); setSave(true); }
    } catch { /* nothing saved or storage blocked */ }
  }, []);
  useSaved(cv, save);

  const plain = useMemo(() => resumeText(cv), [cv]);
  const matches = useMemo(() => (job.trim().length > 40 ? matchTerms(plain, job) : []), [plain, job]);
  const found = matches.filter((m) => m.found).length;

  const update = (patch: Partial<Resume>) => setCv((current) => ({ ...current, ...patch }));
  const updateExp = (id: string, patch: Partial<Resume["experience"][number]>) => setCv((c) => ({ ...c, experience: c.experience.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const updateEdu = (id: string, patch: Partial<Resume["education"][number]>) => setCv((c) => ({ ...c, education: c.education.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 1800); };

  function toggleSave(next: boolean) {
    setSave(next);
    if (!next) { try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } flash("Removed from this device"); }
  }

  function erase() {
    if (!window.confirm("Clear the whole CV from this page and this device?")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setCv(emptyResume());
    setSave(false);
    setSuggestion(null);
    setLetter((l) => ({ ...l, text: "", warning: "" }));
  }

  /** Run one AI edit and hold it as a suggestion; nothing changes until accepted. */
  async function suggest(key: string, original: string, messages: Parameters<typeof generate>[0], apply: (text: string) => void, maxNewTokens = 120) {
    if (!ready || busyKey || original.trim().length < 3) return;
    setBusyKey(key);
    setError("");
    setSuggestion(null);
    try {
      const result = await generate(messages, { maxNewTokens, temperature: 0.2 });
      if (result.interrupted) return;
      const output = cleanRewrite(result.text).replace(/^[-•*]\s*/, "");
      if (!output) throw new Error("The model returned nothing. Try again.");
      const sources = [original];
      const added = [...addedProtected(sources, output).map((i) => i.value), ...addedNames([plain, original], output)];
      setSuggestion({ key, original, output, apply, warning: added.length ? describeItems(added.map((value) => ({ value }))) : "" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The suggestion failed. Nothing was changed.");
    } finally {
      setBusyKey("");
    }
  }

  async function draftLetter() {
    if (!ready || busyKey) return;
    setBusyKey("letter");
    setError("");
    setLive("");
    try {
      const result = await generate(coverLetterMessages(plain, job, letter), { maxNewTokens: 520, temperature: 0.4, onToken: (t) => setLive((s) => s + t) });
      if (result.interrupted) throw new Error("Stopped before the letter was finished. Nothing was kept.");
      const text = cleanRewrite(result.text);
      if (text.length < 200) throw new Error("The model didn't produce a usable letter. Add more detail to your CV and try again.");
      const added = [...addedProtected([plain, job, letter.company, letter.role], text).map((i) => i.value), ...addedNames([plain, job, letter.company, letter.role, "Hiring Manager Company Role"], text)];
      setLetter((l) => ({ ...l, text, warning: added.length ? describeItems(added.map((value) => ({ value })), 10) : "" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Drafting failed.");
    } finally {
      setBusyKey("");
      setLive("");
    }
  }

  const renderSuggestion = (id: string) => suggestion?.key === id ? (
    <div className="ws-piece">
      <span className="ws-side-label">AI suggestion · review before accepting</span>
      <p><DiffView before={suggestion.original} after={suggestion.output} /></p>
      {suggestion.warning ? <p className="ws-warn"><WarningCircle size={15} aria-hidden="true" /> Contains details that aren&apos;t in your CV: {suggestion.warning}. Only keep them if they are true.</p> : null}
      <div className="ws-decide" role="group" aria-label="Suggestion">
        <button type="button" onClick={() => { suggestion.apply(suggestion.output); setSuggestion(null); }}><Check size={14} aria-hidden="true" /> {suggestion.warning ? "Accept anyway" : "Accept"}</button>
        <button type="button" onClick={() => setSuggestion(null)}><X size={14} aria-hidden="true" /> Reject</button>
      </div>
    </div>
  ) : busyKey === id ? <p className="ws-muted">Working on device… <button type="button" className="ws-link" onClick={cancelGeneration}>Stop</button></p> : null;

  const aiButton = (id: string, label: string, onClick: () => void, disabledExtra = false) => (
    <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={onClick} disabled={!ready || Boolean(busyKey) || disabledExtra} title={ready ? undefined : "Load the on-device model first"}><MagicWand size={14} aria-hidden="true" /> {label}</button>
  );

  const grammarFix = (value: string) => { let next = value; for (let i = 0; i < 3; i += 1) { const f = lintText(next).filter((x) => x.fix !== undefined); if (!f.length) break; next = applyFixes(next, f); } return next; };

  return (
    <div className="utility-panel ws">
      <ModelPanel purpose="CV editing" />
      <p className="ws-muted">The CV editor, keyword match, rule-based fixes and PDF export work without the model. AI suggestions never change your CV until you accept them, and anything not found in your CV is flagged.</p>

      <div className="ws-tabs" role="tablist" aria-label="Resume sections">
        {([["edit", "Edit CV"], ["match", "Job match"], ["letter", "Cover letter"], ["preview", "Preview & PDF"]] as [Tab, string][]).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {error ? <p className="utility-error" role="alert"><WarningCircle size={16} weight="bold" aria-hidden="true" /> {error}</p> : null}

      {tab === "edit" ? (
        <div className="ws ws-card" role="tabpanel">
          <div className="ws-grid-2">
            {([["name", "Full name"], ["headline", "Headline (e.g. Data analyst)"], ["email", "Email"], ["phone", "Phone"], ["location", "Location"], ["links", "Links (LinkedIn, portfolio)"]] as [keyof Resume, string][]).map(([key, label]) => (
              <label key={key} className="ws-field">{label}<input value={cv[key] as string} onChange={(event) => update({ [key]: event.target.value } as Partial<Resume>)} autoComplete="off" /></label>
            ))}
          </div>
          <label className="ws-field">Professional summary<textarea value={cv.summary} onChange={(event) => update({ summary: event.target.value })} placeholder="2–4 sentences about who you are and what you offer." /></label>
          <div className="utility-buttons ws-start">
            <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => update({ summary: grammarFix(cv.summary) })} disabled={!cv.summary.trim()}><Check size={14} aria-hidden="true" /> Rule-based fixes</button>
            {aiButton("summary", "Improve summary", () => suggest("summary", cv.summary, summaryMessages(cv.summary), (text) => update({ summary: text }), 200), !cv.summary.trim())}
          </div>
          {renderSuggestion("summary")}

          <h2 className="detail-section-title">Experience</h2>
          {cv.experience.map((exp) => (
            <fieldset key={exp.id} className="ws-entry">
              <legend className="sr-only">Experience entry</legend>
              <div className="ws-grid-2">
                <label className="ws-field">Job title<input value={exp.role} onChange={(e) => updateExp(exp.id, { role: e.target.value })} /></label>
                <label className="ws-field">Organisation<input value={exp.organisation} onChange={(e) => updateExp(exp.id, { organisation: e.target.value })} /></label>
                <label className="ws-field">Start (e.g. Mar 2022)<input value={exp.start} onChange={(e) => updateExp(exp.id, { start: e.target.value })} /></label>
                <label className="ws-field">End (or Present)<input value={exp.end} onChange={(e) => updateExp(exp.id, { end: e.target.value })} /></label>
              </div>
              <label className="ws-field">Location<input value={exp.location} onChange={(e) => updateExp(exp.id, { location: e.target.value })} /></label>
              {exp.bullets.map((bullet, index) => {
                const id = `${exp.id}-${index}`;
                const setBullet = (text: string) => updateExp(exp.id, { bullets: exp.bullets.map((b, j) => (j === index ? text : b)) });
                return (
                  <div key={id} className="ws-entry">
                    <label className="ws-field">Achievement or responsibility {index + 1}<textarea value={bullet} onChange={(e) => setBullet(e.target.value)} placeholder="What you did, how, and the result (with real numbers if you have them)." /></label>
                    <div className="utility-buttons ws-start">
                      {aiButton(id, "Improve bullet", () => suggest(id, bullet, bulletMessages(bullet, exp.role), setBullet), !bullet.trim())}
                      <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => setBullet(grammarFix(bullet))} disabled={!bullet.trim()}><Check size={14} aria-hidden="true" /> Rule-based fixes</button>
                      <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => updateExp(exp.id, { bullets: exp.bullets.filter((_, j) => j !== index) })} disabled={exp.bullets.length === 1}><Trash size={14} aria-hidden="true" /> Remove</button>
                    </div>
                    {renderSuggestion(id)}
                  </div>
                );
              })}
              <div className="utility-buttons ws-start">
                <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => updateExp(exp.id, { bullets: [...exp.bullets, ""] })}><Plus size={14} aria-hidden="true" /> Add bullet</button>
                <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => setCv((c) => ({ ...c, experience: c.experience.filter((e) => e.id !== exp.id) }))}><Trash size={14} aria-hidden="true" /> Remove job</button>
              </div>
            </fieldset>
          ))}
          <div className="utility-buttons ws-start"><button type="button" className="ui-button ui-button-ghost" onClick={() => setCv((c) => ({ ...c, experience: [...c.experience, emptyExperience()] }))}><Plus size={16} aria-hidden="true" /> Add job</button></div>

          <h2 className="detail-section-title">Education</h2>
          {cv.education.map((edu) => (
            <fieldset key={edu.id} className="ws-entry">
              <legend className="sr-only">Education entry</legend>
              <div className="ws-grid-2">
                <label className="ws-field">Qualification<input value={edu.qualification} onChange={(e) => updateEdu(edu.id, { qualification: e.target.value })} /></label>
                <label className="ws-field">Institution<input value={edu.institution} onChange={(e) => updateEdu(edu.id, { institution: e.target.value })} /></label>
                <label className="ws-field">Start<input value={edu.start} onChange={(e) => updateEdu(edu.id, { start: e.target.value })} /></label>
                <label className="ws-field">End<input value={edu.end} onChange={(e) => updateEdu(edu.id, { end: e.target.value })} /></label>
              </div>
              <label className="ws-field">Details (grade, modules, awards)<textarea value={edu.details} onChange={(e) => updateEdu(edu.id, { details: e.target.value })} /></label>
              <div className="utility-buttons ws-start"><button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => setCv((c) => ({ ...c, education: c.education.filter((e) => e.id !== edu.id) }))}><Trash size={14} aria-hidden="true" /> Remove</button></div>
            </fieldset>
          ))}
          <div className="utility-buttons ws-start"><button type="button" className="ui-button ui-button-ghost" onClick={() => setCv((c) => ({ ...c, education: [...c.education, emptyEducation()] }))}><Plus size={16} aria-hidden="true" /> Add education</button></div>

          <label className="ws-field">Skills (comma or line separated)<textarea value={cv.skills} onChange={(e) => update({ skills: e.target.value })} placeholder="e.g. SQL, Excel, stakeholder communication, Python" /></label>

          <h2 className="detail-section-title">Other sections</h2>
          {cv.extras.map((extra) => (
            <fieldset key={extra.id} className="ws-entry">
              <legend className="sr-only">Extra section</legend>
              <label className="ws-field">Section title (e.g. Certifications, Projects, Languages)<input value={extra.title} onChange={(e) => setCv((c) => ({ ...c, extras: c.extras.map((x) => (x.id === extra.id ? { ...x, title: e.target.value } : x)) }))} /></label>
              <label className="ws-field">Content (one item per line)<textarea value={extra.body} onChange={(e) => setCv((c) => ({ ...c, extras: c.extras.map((x) => (x.id === extra.id ? { ...x, body: e.target.value } : x)) }))} /></label>
              <div className="utility-buttons ws-start"><button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => setCv((c) => ({ ...c, extras: c.extras.filter((x) => x.id !== extra.id) }))}><Trash size={14} aria-hidden="true" /> Remove section</button></div>
            </fieldset>
          ))}
          <div className="utility-buttons ws-start"><button type="button" className="ui-button ui-button-ghost" onClick={() => setCv((c) => ({ ...c, extras: [...c.extras, { id: newId(), title: "", body: "" }] }))}><Plus size={16} aria-hidden="true" /> Add section</button></div>
        </div>
      ) : null}

      {tab === "match" ? (
        <div className="ws ws-card" role="tabpanel">
          <label className="ws-field">Job description<textarea rows={10} value={job} onChange={(e) => setJob(e.target.value)} placeholder="Paste the full job advert, including requirements." /></label>
          {matches.length ? (
            <>
              <p><strong>Your CV mentions {found} of {matches.length} key terms</strong> found in this job description.</p>
              <p className="ws-muted">Deterministic word matching (with common abbreviations and word endings). It is not an ATS score: employers&apos; systems work differently and none can be predicted here. Only add a missing term if it&apos;s genuinely true for you.</p>
              {(["required", "other"] as const).map((group) => {
                const list = matches.filter((m) => (group === "required" ? m.required : !m.required));
                return list.length ? (
                  <div key={group} className="ws-entry">
                    <span className="ws-side-label">{group === "required" ? "In requirement lines" : "Other repeated terms"}</span>
                    <ul className="ws-terms">{list.map((m) => <li key={m.term} className={`ws-term ${m.found ? "is-hit" : "is-miss"}`}>{m.found ? "✓" : "✗"} {m.term}<span className="sr-only">{m.found ? " (in your CV)" : " (not in your CV)"}</span></li>)}</ul>
                  </div>
                ) : null;
              })}
            </>
          ) : <p className="utility-placeholder">Paste a job description (a few sentences or more) to compare it with your CV.</p>}
        </div>
      ) : null}

      {tab === "letter" ? (
        <div className="ws ws-card" role="tabpanel">
          <div className="ws-grid-2">
            <label className="ws-field">Company<input value={letter.company} onChange={(e) => setLetter((l) => ({ ...l, company: e.target.value }))} /></label>
            <label className="ws-field">Role<input value={letter.role} onChange={(e) => setLetter((l) => ({ ...l, role: e.target.value }))} /></label>
          </div>
          <label className="ws-field">Tone<select value={letter.tone} onChange={(e) => setLetter((l) => ({ ...l, tone: e.target.value }))}><option value="professional">Professional</option><option value="warm and enthusiastic">Warm</option><option value="concise">Concise</option></select></label>
          <p className="ws-muted">Uses your CV and the job description from the Job match tab. {job.trim() ? "" : "No job description yet; the letter will be generic."}</p>
          <div className="utility-buttons ws-start">
            {busyKey === "letter" ? <button type="button" className="ui-button ui-button-ghost" onClick={cancelGeneration}><Stop size={16} aria-hidden="true" /> Stop</button> : aiButton("letter", "Draft cover letter", draftLetter, plain.length < 80)}
          </div>
          {plain.length < 80 ? <p className="ws-muted">Add your experience first so the letter has real facts to draw on.</p> : null}
          {busyKey === "letter" ? <div className="utility-result ws-live">{live || "Drafting on device…"}</div> : null}
          {letter.text ? (
            <>
              {letter.warning ? <p className="ws-warn"><WarningCircle size={15} aria-hidden="true" /> Not found in your CV or the job description: {letter.warning}. Remove these unless they are true.</p> : <p className="ws-ok"><Check size={15} aria-hidden="true" /> No numbers or names outside your CV and the job description were detected. Still read it carefully.</p>}
              <label className="ws-field">Your letter (edit freely)<textarea rows={14} value={letter.text} onChange={(e) => setLetter((l) => ({ ...l, text: e.target.value }))} /></label>
              <div className="utility-buttons ws-start">
                <button type="button" className="ui-button ui-button-ghost" onClick={async () => flash((await copyText(letter.text)) ? "Copied" : "Copy blocked")}><Copy size={16} aria-hidden="true" /> Copy</button>
                <button type="button" className="ui-button ui-button-ghost" onClick={() => downloadFile("cover-letter.txt", letter.text)}><DownloadSimple size={16} aria-hidden="true" /> .txt</button>
                <button type="button" className="ui-button ui-button-ghost" onClick={() => downloadFile("cover-letter.html", textToHtmlDocument("Cover letter", letter.text), "text/html")}><DownloadSimple size={16} aria-hidden="true" /> Doc (.html)</button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === "preview" ? (
        <div className="ws" role="tabpanel">
          <div className="utility-actions">
            <fieldset className="utility-options">
              <legend>Template</legend>
              {(["classic", "modern"] as const).map((t) => <label key={t} className={`utility-chip ${template === t ? "is-active" : ""}`}><input type="radio" className="sr-only" checked={template === t} onChange={() => setTemplate(t)} />{t === "classic" ? "Classic" : "Modern"}</label>)}
            </fieldset>
            <div className="utility-buttons">
              <button type="button" className="ui-button ui-button-ghost" onClick={() => downloadFile("cv.txt", plain)} disabled={!plain}><DownloadSimple size={16} aria-hidden="true" /> .txt</button>
              <button type="button" className="ui-button ui-button-primary" onClick={() => window.print()}><Printer size={16} weight="bold" aria-hidden="true" /> Print / Save as PDF</button>
            </div>
          </div>
          <p className="ws-muted">Choose “Save as PDF” as the printer in your browser&apos;s print dialog. The PDF is created on your device.</p>
          <CvSheet cv={cv} template={template} />
          {typeof document !== "undefined" ? createPortal(<div className="cv-print-portal"><CvSheet cv={cv} template={template} /></div>, document.body) : null}
        </div>
      ) : null}

      <div className="utility-actions">
        <label className="ws-consent"><input type="checkbox" checked={save} onChange={(e) => toggleSave(e.target.checked)} /> <span>Save my CV in this browser (on this device only). Leave off on shared computers.</span></label>
        <div className="utility-buttons">
          <span className="utility-count" aria-live="polite">{notice}</span>
          <button type="button" className="ui-button ui-button-ghost" onClick={erase}><Trash size={16} aria-hidden="true" /> Clear CV</button>
        </div>
      </div>
    </div>
  );
}

function CvSheet({ cv, template }: { cv: Resume; template: "classic" | "modern" }) {
  const contact = [cv.email, cv.phone, cv.location, cv.links].filter((s) => s.trim());
  const jobs = cv.experience.filter((e) => e.role || e.organisation || e.bullets.some((b) => b.trim()));
  const schools = cv.education.filter((e) => e.qualification || e.institution);
  const skills = skillList(cv.skills);
  return (
    <article className={`cv-sheet is-${template}`} aria-label="CV preview">
      <div className="cv-name">{cv.name || "Your name"}</div>
      {cv.headline ? <div>{cv.headline}</div> : null}
      {contact.length ? <div className="cv-contact">{contact.join(" · ")}</div> : null}
      {cv.summary.trim() ? <><h3>Profile</h3><p>{cv.summary}</p></> : null}
      {jobs.length ? <><h3>Experience</h3>{jobs.map((e) => (
        <section key={e.id} style={{ marginBottom: 10 }}>
          <div className="cv-row"><span>{e.role}{e.organisation ? <span className="cv-sub"> · {e.organisation}</span> : null}</span><span className="cv-sub">{[e.start, e.end].filter(Boolean).join(" – ")}{e.location ? ` · ${e.location}` : ""}</span></div>
          <ul>{e.bullets.filter((b) => b.trim()).map((b, i) => <li key={i}>{b}</li>)}</ul>
        </section>
      ))}</> : null}
      {schools.length ? <><h3>Education</h3>{schools.map((e) => (
        <section key={e.id} style={{ marginBottom: 8 }}>
          <div className="cv-row"><span>{e.qualification}{e.institution ? <span className="cv-sub"> · {e.institution}</span> : null}</span><span className="cv-sub">{[e.start, e.end].filter(Boolean).join(" – ")}</span></div>
          {e.details ? <p>{e.details}</p> : null}
        </section>
      ))}</> : null}
      {skills.length ? <><h3>Skills</h3><p>{skills.join(" · ")}</p></> : null}
      {cv.extras.filter((x) => x.title || x.body).map((x) => <section key={x.id}><h3>{x.title}</h3><ul>{x.body.split("\n").filter((l) => l.trim()).map((l, i) => <li key={i}>{l}</li>)}</ul></section>)}
    </article>
  );
}
