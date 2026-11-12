"use client";

import { useEffect, useState } from "react";

type Draft = {
  id: string;
  title?: string;
  description?: string;
  bodyMarkdown?: string;
  category?: string;
  image?: string;
  imageAlt?: string;
  imageCredit?: string;
  sources?: Array<{ title?: string; url?: string; publisher?: string }>;
  needsReview?: boolean;
  validation?: { errors?: string[] };
  reactionPrompt?: string;
  contextualPoll?: { question?: string; options?: string[] } | null;
  quickRead?: { twentySecondAnswer?: string; keyPoints?: string[]; whatShouldIDo?: string };
  product?: { brand?: string; productName?: string; model?: string; provider?: string; exactMatch?: boolean; matchScore?: number };
};

// Draft bodies sometimes arrive with literal backslash-n sequences (e.g. from
// a hand-typed or scripted source) instead of real line breaks — normalize
// before splitting into lines so those don't render as visible "\n" text.
function normalizeBody(body: string) {
  return body.replace(/\\n/g, "\n");
}

function BodyPreview({ body }: { body: string }) {
  const lines = normalizeBody(body).split("\n");
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(
        <p className="mt-4 text-[16px] leading-7 text-[#3a3d44]" key={blocks.length}>
          {paragraph.join(" ")}
        </p>
      );
      paragraph = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      flushParagraph();
      blocks.push(
        <figure className="mt-5" key={blocks.length}>
          {/* Flexible draft URLs may be data/blob URLs or unconfigured hosts. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="max-h-[32rem] w-full object-contain bg-[#f4f4f5]" src={image[2]} alt={image[1] || "Article image"} />
          <figcaption className="mt-1.5 text-xs text-[#8a8d94]">Embedded article image</figcaption>
        </figure>
      );
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const text = heading[2];
      const className =
        level === 1
          ? "mt-6 text-xl font-semibold text-[#111]"
          : level === 2
          ? "mt-5 text-lg font-semibold text-[#111]"
          : "mt-4 text-base font-semibold text-[#111]";
      blocks.push(<p className={className} key={blocks.length}>{text}</p>);
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();

  return <div>{blocks}</div>;
}

function ChecklistItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[#3a3d44]">
      <span aria-hidden className={passed ? "text-[#1f7a3d]" : "text-[#b0392a]"}>
        {passed ? "✓" : "!"}
      </span>
      {label}
    </div>
  );
}

export default function ModeratorDashboard() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/editorial/drafts");
    if (response.ok) {
      const data = (await response.json()).drafts as Draft[];
      setLoggedIn(true);
      setDrafts(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    }
    setChecking(false);
  }
  useEffect(() => {
    queueMicrotask(() => { void load(); });
  }, []);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/admin/editorial/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setMessage("That password was not accepted.");
      return;
    }
    setMessage("");
    await load();
  }

  async function decide(id: string, decision: "published" | "rejected") {
    setBusy(id);
    const response = await fetch(`/api/admin/editorial/drafts/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setBusy(null);
    if (response.ok) {
      setDrafts((items) => {
        const remaining = items.filter((item) => item.id !== id);
        setSelectedId((current) => (current === id ? remaining[0]?.id ?? null : current));
        return remaining;
      });
      setMessage(decision === "published" ? "Published successfully." : "Draft sent back.");
    } else {
      setMessage("Something went wrong. Please try again.");
    }
  }

  if (checking) {
    return <main className="min-h-screen bg-[#fafafa]" />;
  }

  if (!loggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fafafa] px-5">
        <div className="w-full max-w-sm">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#8a8d94]">BrisaStory Editorial</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#111]">Review desk</h1>
          <p className="mt-2 text-sm text-[#686b73]">Sign in to review pending story drafts.</p>
          <form onSubmit={login} className="mt-6">
            <label className="text-sm font-medium text-[#111]">
              Password
              <input
                className="mt-1.5 w-full border border-[#d8d9dd] px-3 py-2.5 text-sm outline-none focus:border-[#111]"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
              />
            </label>
            <button className="mt-4 w-full bg-[#111] py-2.5 text-sm font-medium text-white" type="submit">
              Sign in
            </button>
          </form>
          {message && <p className="mt-3 text-sm text-[#b0392a]">{message}</p>}
        </div>
      </main>
    );
  }

  const selected = drafts.find((draft) => draft.id === selectedId) ?? null;
  const checks = selected
    ? ([
        ["Text complete", Boolean(selected.bodyMarkdown)],
        ["Sources attached", Boolean(selected.sources?.length)],
        ["Image available", Boolean(selected.image)],
        ["No automatic warning", !selected.needsReview && !selected.validation?.errors?.length],
      ] as const)
    : [];

  return (
    <main className="min-h-screen bg-[#fafafa]">
      <header className="flex items-center justify-between border-b border-[#e5e6e9] px-6 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#8a8d94]">BrisaStory Editorial</p>
          <h1 className="text-lg font-semibold text-[#111]">Review desk</h1>
        </div>
        <span className="text-sm text-[#686b73]">{drafts.length} waiting</span>
      </header>

      {message && (
        <div className="border-b border-[#e5e6e9] bg-white px-6 py-2.5 text-sm text-[#111]">{message}</div>
      )}

      {drafts.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-[#111]">All clear</h2>
          <p className="mt-1 text-sm text-[#686b73]">No stories are waiting for review.</p>
        </div>
      ) : (
        <div className="flex" style={{ minHeight: "calc(100vh - 65px)" }}>
          <nav className="w-64 flex-shrink-0 border-r border-[#e5e6e9] overflow-y-auto">
            {drafts.map((draft) => (
              <button
                key={draft.id}
                onClick={() => setSelectedId(draft.id)}
                className={`block w-full border-b border-[#f0f0f1] px-4 py-3 text-left ${
                  draft.id === selectedId ? "bg-white" : "hover:bg-[#f4f4f5]"
                }`}
              >
                <p className="text-xs text-[#8a8d94]">{draft.category ?? "Story"}</p>
                <p className="mt-0.5 line-clamp-2 text-sm font-medium text-[#111]">{draft.title}</p>
              </button>
            ))}
          </nav>

          {selected && (
            <div className="flex-1 overflow-y-auto px-8 py-8">
              <div className="mx-auto max-w-2xl">
                <p className="text-xs text-[#8a8d94]">{selected.category ?? "Story"}</p>
                <h2 className="mt-1 text-2xl font-semibold leading-snug text-[#111]">{selected.title}</h2>
                <p className="mt-3 text-base leading-7 text-[#686b73]">{selected.description}</p>

                {selected.quickRead && <section className="mt-6 border-y border-[#e5e6e9] py-4"><p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a8d94]">Quick read</p><p className="mt-2 text-sm leading-6 text-[#3a3d44]">{selected.quickRead.twentySecondAnswer}</p>{selected.quickRead.keyPoints?.length ? <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-[#3a3d44]">{selected.quickRead.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul> : null}{selected.quickRead.whatShouldIDo && <p className="mt-2 text-sm leading-6 text-[#3a3d44]"><strong>What should I do?</strong> {selected.quickRead.whatShouldIDo}</p>}</section>}

                {selected.reactionPrompt && <section className="mt-5 bg-[#f1f4ff] p-4"><p className="text-xs font-medium uppercase tracking-[0.08em] text-[#2864df]">Readers&apos; Take</p><p className="mt-2 text-sm leading-6 text-[#303541]">{selected.reactionPrompt}</p></section>}

                {selected.contextualPoll && <section className="mt-5 border border-[#e5e6e9] p-4"><p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a8d94]">Article question</p><p className="mt-2 text-sm font-medium text-[#111]">{selected.contextualPoll.question}</p><ul className="mt-2 list-disc pl-5 text-sm text-[#3a3d44]">{selected.contextualPoll.options?.map((option) => <li key={option}>{option}</li>)}</ul></section>}

                {selected.product && <section className="mt-5 border border-[#e5e6e9] p-4"><p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a8d94]">Product verification</p><p className="mt-2 text-sm text-[#111]">{selected.product.brand} {selected.product.productName} {selected.product.model}</p><p className="mt-1 text-xs text-[#686b73]">Source: {selected.product.provider || "Not resolved"} · Exact match: {selected.product.exactMatch ? "Yes" : "No"} · Confidence: {selected.product.matchScore ? `${Math.round(selected.product.matchScore * 100)}%` : "Unavailable"}</p></section>}

                {selected.image && (
                  <figure className="mt-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="w-full object-cover" src={selected.image} alt={selected.imageAlt ?? "Article image"} />
                    <figcaption className="mt-1.5 text-xs text-[#8a8d94]">
                      Image credit: {selected.imageCredit ?? "Source recorded in editorial notes"}
                    </figcaption>
                  </figure>
                )}

                <div className="mt-6 grid grid-cols-2 gap-2 border-y border-[#e5e6e9] py-4">
                  {checks.map(([label, passed]) => (
                    <ChecklistItem key={label} label={label} passed={passed} />
                  ))}
                </div>
                {selected.validation?.errors?.length ? (
                  <p className="mt-3 text-sm text-[#b0392a]">Review notes: {selected.validation.errors.join("; ")}</p>
                ) : null}

                <div className="mt-6">
                  {selected.bodyMarkdown && <BodyPreview body={selected.bodyMarkdown} />}
                </div>

                {(selected.sources ?? []).length > 0 && (
                  <div className="mt-8">
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#8a8d94]">Sources</p>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {(selected.sources ?? []).map((source) => (
                        <li key={source.url}>
                          <a className="text-[#2864df] underline" href={source.url} target="_blank" rel="noreferrer">
                            {source.title ?? source.url}
                          </a>
                          {source.publisher ? <span className="text-[#8a8d94]"> · {source.publisher}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-10 flex gap-3 border-t border-[#e5e6e9] pt-6">
                  <button
                    className="bg-[#111] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                    disabled={busy === selected.id}
                    onClick={() => decide(selected.id, "published")}
                  >
                    {busy === selected.id ? "Saving…" : "Approve and publish"}
                  </button>
                  <button
                    className="border border-[#d8d9dd] px-5 py-2.5 text-sm font-medium text-[#111] disabled:opacity-50"
                    disabled={busy === selected.id}
                    onClick={() => decide(selected.id, "rejected")}
                  >
                    Send back
                  </button>
                </div>
                <p className="mt-2.5 text-xs text-[#8a8d94]">Approve only when the story, image, sources, and warnings look correct.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
