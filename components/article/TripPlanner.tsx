import { ArrowRight } from "@phosphor-icons/react/ssr";
import Image from "@/components/ui/MediaImage";

type PlannerKind = "flight" | "stay" | "experience" | "london-stay" | "london-experience" | "london-transfer";

const recommendations: Record<PlannerKind, { label: string; title: string; destination: string; description: string; href: string; cta: string; image: string; imageAlt: string }> = {
  stay: { label: "Where to stay", title: "Stay somewhere you'll actually want to come back to", destination: "Hoi An", description: "Compare stays around the old town, cafés and the parts of Hoi An you'll actually be exploring.", href: "https://www.trip.com/t/BiDJo3zuWW2", cta: "Compare stays", image: "https://images.pexels.com/photos/2174656/pexels-photo-2174656.jpeg?auto=compress&cs=tinysrgb&w=1400", imageAlt: "A warm tropical road scene in Vietnam." },
  flight: { label: "Getting there", title: "Hanoi → Da Nang", destination: "Middle of the route", description: "Compare flight times, fares and baggage options before locking in the middle of the route.", href: "https://www.trip.com/t/ML85V4wuWW2", cta: "Compare flights", image: "https://images.pexels.com/photos/19504817/pexels-photo-19504817.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", imageAlt: "A lively Hanoi street in warm morning light." },
  experience: { label: "Do something", title: "Don't leave Hoi An at just lantern photos", destination: "Hoi An", description: "Browse activities, tours and experiences worth adding to the trip.", href: "https://www.trip.com/t/7rAkI63vWW2", cta: "Explore Hoi An", image: "https://images.pexels.com/photos/2474690/pexels-photo-2474690.jpeg?auto=compress&cs=tinysrgb&w=1400", imageAlt: "A bright Vietnamese beach with mountains in the distance." },
  "london-stay": { label: "Where to stay", title: "Find your London base", destination: "London", description: "Compare well-connected stays before locking in the rest of the trip.", href: "https://www.trip.com/t/mWAAUIDzWW2", cta: "Compare London stays", image: "https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1400", imageAlt: "A calm hotel room prepared for a city stay." },
  "london-experience": { label: "Pick your London moment", title: "Choose the one thing you would hate to miss", destination: "London", description: "Browse attractions, tours and experiences worth adding when you actually care about them.", href: "https://www.trip.com/t/mXEjbNEzWW2", cta: "Explore London experiences", image: "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=1400", imageAlt: "A historic city landmark lit by warm evening light." },
  "london-transfer": { label: "Getting there", title: "Make the airport handoff easier", destination: "London airports → city", description: "Compare airport transfer options before your arrival day becomes a logistics puzzle.", href: "https://www.trip.com/t/u3rFkAGzWW2", cta: "Compare airport transfers", image: "https://images.pexels.com/photos/358319/pexels-photo-358319.jpeg?auto=compress&cs=tinysrgb&w=1400", imageAlt: "An airport runway and aircraft ready for arrival." },
};

export default function TripPlanner({ kind }: { kind: PlannerKind }) {
  const recommendation = recommendations[kind];
  return (
    <aside className="editorial-surface my-8 overflow-hidden bg-[#f7f8fb] sm:my-10" aria-label={`${recommendation.label} recommendation`}>
      <div className="grid grid-cols-[92px_minmax(0,1fr)] sm:grid-cols-[minmax(180px,0.42fr)_1fr]">
        <div className="relative min-h-full overflow-hidden sm:aspect-auto sm:min-h-[190px]"><Image src={recommendation.image} alt={recommendation.imageAlt} fill sizes="(max-width: 640px) 92px, 280px" className="object-cover" /></div>
        <div className="flex min-w-0 flex-col justify-center p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4"><p className="editorial-label text-electric">{recommendation.label}</p><span className="whitespace-nowrap text-[10px] text-[#8a8f99]">via Trip.com</span></div>
          <h3 className="mt-2 font-heading text-[19px] font-semibold leading-[1.12] tracking-[-0.025em] text-near-black sm:text-[27px]">{recommendation.title}</h3>
          <p className="mt-1.5 text-[12px] font-semibold text-[#626875]">{recommendation.destination}</p>
          <p className="mt-2 max-w-[48ch] text-[13px] leading-5 text-muted sm:text-[14px]">{recommendation.description}</p>
          <a href={recommendation.href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="editorial-cta mt-4 w-full sm:w-fit">{recommendation.cta} <ArrowRight size={15} weight="bold" aria-hidden="true" /></a>
        </div>
      </div>
    </aside>
  );
}
