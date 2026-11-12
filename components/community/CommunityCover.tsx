import Image from "@/components/ui/MediaImage";

export default function CommunityCover({ src, alt }: { src: string; alt: string }) {
  return <figure className="my-10 overflow-hidden bg-[#f1f0ec] md:my-14"><div className="relative aspect-[16/10] sm:aspect-[16/9]"><Image src={src} alt={alt} fill sizes="(max-width: 640px) 100vw, 1024px" className="object-cover object-center" /></div></figure>;
}
