"use client";

import { useEffect, useState } from "react";

/** Subtle reading-progress bar pinned under the header. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    let raf = 0;
    const update = () => {
      const rect = target.getBoundingClientRect();
      const viewport = window.innerHeight;
      const total = rect.height - viewport;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      setProgress(total <= 0 ? 1 : scrolled / total);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetId]);

  return (
    <div className="fixed left-0 top-[var(--header-height)] z-30 h-[3px] w-full bg-transparent" aria-hidden="true">
      <div className="h-full origin-left bg-sky-500 transition-transform duration-75 ease-out" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
