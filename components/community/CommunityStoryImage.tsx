"use client";
import { useMemo } from "react";
import Image from "@/components/ui/MediaImage";
import { getMediaLayout, getMediaShape } from "@/lib/community-media-layout";

export default function CommunityStoryImage({ src, width = 1600, height = 900, alt = "", caption = "" }: { src: string; width?: number; height?: number; alt?: string; caption?: string }) {
  const layout = useMemo(() => getMediaLayout(getMediaShape(width, height)), [width, height]);
  return <figure className={`my-10 md:my-14 ${layout.frame}`}><div className="overflow-hidden bg-[#f3f2ee]"><Image src={src} alt={alt} width={width} height={height} loading="lazy" sizes="(max-width: 768px) 100vw, 1024px" className={`block ${layout.image}`} /></div>{caption && <figcaption className="mt-3 max-w-2xl text-sm leading-5 text-black/55">{caption}</figcaption>}</figure>;
}
