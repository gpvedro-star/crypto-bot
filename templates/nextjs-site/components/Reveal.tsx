"use client";
import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

/** Progressive reveal: content rises 24px and fades in once, when it enters the viewport. */
export function Reveal({ as: Tag = "div", delay = 0, className = "", children }: { as?: ElementType; delay?: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${seen ? "is-visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
