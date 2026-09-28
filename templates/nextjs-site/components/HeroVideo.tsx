"use client";
import { useEffect, useState } from "react";

/** Mounts the video only on large screens, without reduced-motion preference: protects mobile data and LCP. */
export function HeroVideo({ src, poster }: { src: string; poster?: string }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(window.matchMedia("(min-width: 1200px) and (prefers-reduced-motion: no-preference)").matches);
  }, []);
  if (!ok) return null;
  return <video className="hero-video" src={src} poster={poster} autoPlay muted loop playsInline preload="metadata" />;
}
