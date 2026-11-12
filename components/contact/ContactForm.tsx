"use client";
import Script from "next/script";
import { FormEvent, useState } from "react";
import { Check } from "@phosphor-icons/react";

const field = "mt-2 min-h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-[15px] font-normal outline-none transition placeholder:text-[#9a9ca3] hover:border-black/20 focus:border-[#6757c5] focus:bg-white focus:ring-4 focus:ring-[#6757c5]/10";
const label = "text-sm font-semibold text-[#171719]";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [formVersion, setFormVersion] = useState(0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("sending"); setError("");
    const form = event.currentTarget;
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error ?? "Please try again."); setStatus("error"); return; }
      form.reset(); setStatus("sent");
    } catch { setError("We could not send your message. Please try again."); setStatus("error"); }
  }
  if (status === "sent") return <section className="mt-10 border-y border-[#dedee7] py-12 sm:py-16" aria-live="polite"><div className="contact-toast max-w-xl"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6757c5] text-white"><Check size={25} weight="bold" aria-hidden="true" /></div><p className="mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6757c5]">Sent</p><h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.03em] text-[#171719] sm:text-4xl">Your message made it to BrisaStory.</h2><p className="mt-4 max-w-md text-base leading-relaxed text-[#6d7078]">We’ll take a look and get back to you if a reply is needed.</p><p className="mt-5 text-sm text-[#858891]">Message successfully escaped the drafts folder.</p><button type="button" onClick={() => { setStatus("idle"); setError(""); setStartedAt(Date.now()); setFormVersion((value) => value + 1); }} className="mt-8 inline-flex min-h-11 items-center justify-center border border-[#171719] px-5 text-sm font-bold text-[#171719] transition hover:border-[#6757c5] hover:text-[#6757c5] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#6757c5]">Send another message</button></div></section>;
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
    <form key={formVersion} onSubmit={submit} className="relative mt-10" aria-label="Contact form">
      <div className="py-1"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6757c5]">Send a message</p><p className="mt-2 text-sm text-[#6d7078]">Tell us what is on your mind. We read every message.</p></div>
      <div className="py-7 sm:py-8">
        <div className="grid gap-5 sm:grid-cols-2"><label className={label}>Name<input name="name" required maxLength={80} autoComplete="name" placeholder="Your name" className={field} /></label><label className={label}>Email<input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" className={field} /></label></div>
        <label className={`${label} mt-5 block`}>Subject<select name="subject" required defaultValue="" className={`${field} appearance-auto`}><option value="" disabled>Select a subject</option><option value="Story feedback">Story feedback</option><option value="Partnership or collaboration">Partnership or collaboration</option><option value="Advertising or media">Advertising or media</option><option value="Technical issue">Technical issue</option><option value="Something else">Something else</option></select></label>
        <label className={`${label} mt-5 block`}>Message<textarea name="message" required minLength={10} maxLength={3000} rows={7} placeholder="Up to 250 words" className={`${field} resize-y py-3`} /><span className="mt-2 block text-xs font-normal text-[#858891]">Maximum 250 words.</span></label>
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" /><input name="startedAt" type="hidden" value={startedAt} />
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && <div className="cf-turnstile mt-5" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} data-action="contact" data-response-field-name="turnstileToken" />}
        <div className="mt-7 flex flex-wrap items-center gap-4"><button type="submit" disabled={status === "sending"} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#6757c5] px-6 text-sm font-bold text-white shadow-[0_8px_18px_rgba(103,87,197,0.2)] transition hover:-translate-y-0.5 hover:bg-[#5849b5] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#6757c5] disabled:cursor-wait disabled:opacity-60">{status === "sending" ? "Sending…" : "Send message"}</button><span className="text-xs text-[#858891]">Usually replies within 1–2 business days.</span></div>
        {status === "error" && <p role="alert" className="mt-5 rounded-lg bg-[#fff0f3] px-4 py-3 text-sm font-semibold text-[#9e285a]">{error.includes("verify") ? "Quick verification failed. Please try again." : "Couldn’t send that one. Try again in a moment."}</p>}
      </div>
    </form>
  </>;
}
