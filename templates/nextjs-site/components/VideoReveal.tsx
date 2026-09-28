"use client";
import { useEffect, useRef } from "react";

/** Video that only plays while visible, and never autoplays for reduced-motion users. */
export function VideoReveal({ src, poster, label }: { src: string; poster?: string; label: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) void v.play().catch(() => {}); else v.pause(); }, { threshold: 0.4 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} className="video-reveal" src={src} poster={poster} muted loop playsInline preload="none" aria-label={label} />;
}
