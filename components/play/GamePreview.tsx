import Image from "@/components/ui/MediaImage";
import type { GameType } from "@/lib/play/storage";

const PREVIEWS: Record<GameType, { src: string; alt: string }> = {
  obby: { src: "/images/play-previews/obby.png", alt: "Brisa Obby gameplay preview" },
  rush: { src: "/images/play-previews/rush.png", alt: "Brisa Rush gameplay preview" },
  breaker: { src: "/images/play-previews/breaker.png", alt: "Brisa Breaker gameplay preview" },
};

export default function GamePreview({ game }: { game: GameType }) {
  const preview = PREVIEWS[game];
  return (
    <div className="relative aspect-[3/2] w-full overflow-hidden border border-card-border bg-[#f6f4ef]">
      <Image src={preview.src} alt={preview.alt} fill sizes="(min-width: 640px) 150px, 92px" className="object-cover" />
    </div>
  );
}
