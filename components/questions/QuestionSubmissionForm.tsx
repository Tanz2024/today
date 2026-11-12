"use client";

import { FormEvent, useId, useRef, useState } from "react";
import { trackHomepageEvent } from "@/lib/homepage-analytics";

const MAX_LENGTH = 800;

export default function QuestionSubmissionForm({ questionSlug }: { questionSlug?: string } = {}) {
  const tracked = useRef(false);
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("");
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const textId = useId();
  const topicId = useId();
  const confirmId = useId();

  const remaining = MAX_LENGTH - text.length;
  const tooLong = remaining < 0;
  const canSubmit = text.trim().length > 0 && !tooLong && confirmed && status !== "sending";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("sending");
    setError("");

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), topic: topic.trim(), email: email.trim(), confirmed }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Something went wrong — please try again.");
        setStatus("error");
        return;
      }

      setText("");
      setTopic("");
      setEmail("");
      setConfirmed(false);
      setStatus("sent");
    } catch {
      setError("Something went wrong — please try again.");
      setStatus("error");
    }
  }

  return (
    <form id="submit-question" onFocus={() => { if (questionSlug && !tracked.current) { tracked.current = true; trackHomepageEvent("ask_question_click", { questionSlug }); } }} onSubmit={submit} aria-label="Submit a question" className="mt-10 border-t border-card-border pt-8 scroll-mt-24">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-electric">Real Questions</p>
      <h2 className="mt-2 font-heading text-[24px] font-semibold tracking-[-0.03em] text-near-black sm:text-[28px]">
        Ask what you&apos;re actually thinking
      </h2>
      <p className="mt-2 max-w-lg text-[14px] leading-[1.55] text-muted">
        Submit anonymously. Questions are reviewed before anything appears publicly.
      </p>

      <div className="mt-6 max-w-lg space-y-4">
        <div>
          <label htmlFor={textId} className="text-sm font-semibold text-near-black">
            Your question
          </label>
          <textarea
            id={textId}
            value={text}
            onChange={(event) => setText(event.target.value)}
            required
            rows={4}
            aria-describedby={`${textId}-count`}
            className={`mt-2 w-full rounded-[8px] border bg-white p-3 text-[15px] outline-none focus:ring-2 focus:ring-electric/30 ${
              tooLong ? "border-red-500" : "border-card-border focus:border-electric"
            }`}
          />
          <p id={`${textId}-count`} className={`mt-1 text-xs ${tooLong ? "text-red-600" : "text-muted"}`}>
            {remaining} characters left
          </p>
        </div>

        <div>
          <label htmlFor={`${topicId}-email`} className="text-sm font-semibold text-near-black">
            Email for confirmation <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={`${topicId}-email`}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-2 min-h-11 w-full rounded-[8px] border border-card-border bg-white px-3 text-[15px] outline-none focus:border-electric focus:ring-2 focus:ring-electric/30"
          />
          <p className="mt-1 text-xs text-muted">Leave blank to stay completely anonymous. We won&apos;t publish your email.</p>
        </div>

        <div>
          <label htmlFor={topicId} className="text-sm font-semibold text-near-black">
            Topic <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={topicId}
            type="text"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            maxLength={80}
            placeholder="e.g. relationships, money, campus"
            className="mt-2 min-h-11 w-full rounded-[8px] border border-card-border bg-white px-3 text-[15px] outline-none focus:border-electric focus:ring-2 focus:ring-electric/30"
          />
        </div>

        <div className="rounded-[8px] border border-card-border bg-off-white p-3 text-[13px] leading-[1.5] text-muted">
          Please don&apos;t include names, contact details, addresses, phone numbers, passwords, or other
          identifying information. This isn&apos;t the place for emergencies or threats — if you need urgent
          help, contact local emergency services.
        </div>

        <label className="flex min-h-11 items-start gap-3 text-[14px] text-near-black">
          <input
            id={confirmId}
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            required
            className="mt-1 h-5 w-5 shrink-0 rounded border-card-border text-electric focus:ring-2 focus:ring-electric/30"
          />
          <span>I confirm this question doesn&apos;t include my name, contact details, or other identifying information.</span>
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="min-h-11 rounded-full bg-electric px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Submit question"}
        </button>

        {status === "sent" && (
          <p role="status" className="text-sm font-medium text-[#16704C]">
            Thanks — your question has been submitted for review.
          </p>
        )}
        {status === "error" && (
          <p role="alert" className="text-sm font-medium text-[#9E285A]">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
