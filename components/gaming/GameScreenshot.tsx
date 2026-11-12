import Image from "@/components/ui/MediaImage";
import { getGameBySlug, getGameScreenshots } from "@/lib/rawg";

export default async function GameScreenshot({ game, index = 0, alt }: { game: string; index?: number; alt?: string }) {
  const [record, screenshots] = await Promise.all([getGameBySlug(game), getGameScreenshots(game)]);
  const image = screenshots[index]?.image ?? record?.image;
  if (!image) return null;
  return <figure className="my-10 sm:my-12"><div className="relative aspect-[16/9] w-full overflow-hidden rounded-[4px] bg-[#f1f2f4]"><Image src={image} alt={alt ?? `${record?.name ?? game} game screenshot`} fill sizes="700px" className="object-cover" /></div><figcaption className="mt-3 text-[12px] leading-[1.45] text-muted">{record?.name ?? game} · game screenshot</figcaption></figure>;
}
