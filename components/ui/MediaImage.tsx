"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { cloudflareMediaSrcSet, cloudflareMediaUrl } from "@/lib/media-image";

export const FALLBACK_IMAGE = "/images/fallback-editorial.svg";

export default function MediaImage({ src, width, ...props }: ImageProps) {
  const transformedSrc = typeof src === "string" ? cloudflareMediaUrl(src, width) : src;
  const srcSet = typeof src === "string" ? cloudflareMediaSrcSet(src, props.sizes, width) : undefined;
  const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null);
  const currentSrc = failedSrc === transformedSrc ? FALLBACK_IMAGE : transformedSrc;

  return <Image
    {...props}
    src={currentSrc}
    {...(currentSrc === transformedSrc && srcSet ? { srcSet } : {})}
    alt={props.alt ?? ""}
    width={width}
    decoding={props.decoding ?? "async"}
    onError={(event) => {
      props.onError?.(event);
      if (currentSrc !== FALLBACK_IMAGE) setFailedSrc(transformedSrc);
    }}
  />;
}
