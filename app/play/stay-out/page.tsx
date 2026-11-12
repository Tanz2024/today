import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import ThisOrThat from "@/components/play/ThisOrThat";
import { goOutStayHome } from "@/lib/games";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Go Out or Stay Home?", description: "Answer quick questions about your social battery, horoscope and current vibe.", path: "/play/stay-out" });

export default function StayOutPage() {
  return <Container className="py-10 sm:py-14"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-electric">Play</p><h1 className="mt-3 font-heading text-5xl font-bold sm:text-7xl">Go out or stay home?</h1><p className="mt-4 max-w-xl text-lg text-muted">A fresh set of low-stakes questions for your social battery, your horoscope and your current vibe.</p><div className="mt-8 max-w-5xl"><ThisOrThat questions={goOutStayHome} currentHref="/play/stay-out" /></div></Container>;
}
