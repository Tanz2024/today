"use client";

import { Pause, Play, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import Image from "@/components/ui/MediaImage";
import { useEffect, useRef, useState } from "react";
import type { ArticleVideo } from "@/types/article";

const ACTIVE_VIDEO_EVENT = "brisastory:editorial-video-active";

function safeUrl(value: string | undefined, allowedHosts: string[] = []) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (allowedHosts.length && !allowedHosts.includes(url.hostname)) return null;
    return url.toString();
  } catch { return null; }
}

function embedUrl(video: ArticleVideo) {
  const supplied = safeUrl(video.embedUrl);
  if (supplied) return supplied;
  if (video.provider === "youtube" && video.videoId) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.videoId)}?playsinline=1&rel=0`;
  if (video.provider === "vimeo" && video.videoId) return `https://player.vimeo.com/video/${encodeURIComponent(video.videoId)}`;
  return null;
}

export default function EditorialVideo({ video }: { video: ArticleVideo }) {
  const mediaRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(video.muted !== false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [externalLoaded, setExternalLoaded] = useState(false);
  const ratio = video.aspectRatio || (video.width && video.height ? `${video.width}/${video.height}` : "16/9");
  const isNative = video.provider === "direct" || video.provider === "mux";
  const poster = safeUrl(video.posterUrl);
  const source = safeUrl(video.streamUrl || (video.provider === "mux" && video.playbackId ? `https://stream.mux.com/${encodeURIComponent(video.playbackId)}.m3u8` : undefined));

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isNative || !mediaRef.current) return;
    const media = mediaRef.current;
    const onActive = (event: Event) => {
      if ((event as CustomEvent).detail !== media) media.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
        if (video.autoplay !== false && !reducedMotion && !pausedByUser) {
          window.dispatchEvent(new CustomEvent(ACTIVE_VIDEO_EVENT, { detail: media }));
          void media.play().catch(() => undefined);
        }
      } else if (entry.intersectionRatio < 0.2) media.pause();
    }, { threshold: [0.2, 0.55, 0.8] });
    observer.observe(media);
    window.addEventListener(ACTIVE_VIDEO_EVENT, onActive);
    return () => { observer.disconnect(); window.removeEventListener(ACTIVE_VIDEO_EVENT, onActive); };
  }, [isNative, pausedByUser, reducedMotion, video.autoplay]);

  function togglePlay() {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) { setPausedByUser(false); window.dispatchEvent(new CustomEvent(ACTIVE_VIDEO_EVENT, { detail: media })); void media.play(); setPlaying(true); }
    else { setPausedByUser(true); media.pause(); setPlaying(false); }
  }

  function toggleMute() {
    const media = mediaRef.current;
    if (!media) return;
    media.muted = !media.muted;
    setMuted(media.muted);
  }

  return (
    <figure className="editorial-video my-10 sm:my-12" aria-label={video.title || "Editorial video"}>
      <div className="relative mx-auto w-full max-w-[1020px] overflow-hidden bg-[#111]" style={{ aspectRatio: ratio }}>
        {isNative && source ? (
          <video ref={mediaRef} src={source} poster={poster ?? undefined} title={video.title || "Editorial video"} autoPlay={false} muted={muted} playsInline loop={video.loop === true} preload="none" controls onLoadedData={() => setReady(true)} className={`h-full w-full object-contain transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}>
            {video.licenseUrl && <track kind="captions" label="English" srcLang="en" src={safeUrl(video.licenseUrl) ?? undefined} />}
          </video>
        ) : poster && !externalLoaded ? (
          <button type="button" onClick={() => setExternalLoaded(true)} className="group absolute inset-0 flex h-full w-full items-center justify-center" aria-label={`Play ${video.title || "editorial video"}`}>
            <Image src={poster} alt="" fill sizes="(max-width: 1020px) 100vw, 1020px" className="object-cover" />
            <span className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#F5F1EC]/75 text-[#111] shadow-sm backdrop-blur-[2px] transition-transform group-hover:scale-105"><Play size={20} weight="fill" /></span>
          </button>
        ) : (video.provider === "youtube" || video.provider === "vimeo") && embedUrl(video) ? (
          <iframe src={embedUrl(video)!} title={video.title || "Editorial video"} className="h-full w-full" loading="eager" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        ) : <div className="flex h-full items-center justify-center text-sm text-white/[.92]">Video unavailable</div>}
        {isNative && source && <div className="absolute bottom-3 right-3 flex gap-2"><button type="button" onClick={togglePlay} className="flex h-11 w-11 items-center justify-center bg-black/65 text-white" aria-label={playing ? "Pause video" : "Play video"}>{playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}</button><button type="button" onClick={toggleMute} className="flex h-11 w-11 items-center justify-center bg-black/65 text-white" aria-label={muted ? "Unmute video" : "Mute video"}>{muted ? <SpeakerSlash size={18} /> : <SpeakerHigh size={18} />}</button></div>}
      </div>
      {(video.caption || video.credit) && <figcaption className="mx-auto mt-3 max-w-[1020px] text-[12px] leading-[1.5] text-muted"><span>{video.caption}</span>{video.credit && <span className="ml-2 text-[#858892]">· {video.credit}</span>}</figcaption>}
    </figure>
  );
}
