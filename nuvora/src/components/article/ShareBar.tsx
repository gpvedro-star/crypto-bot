"use client";

import { useState } from "react";

interface ShareBarProps {
  url: string;
  title: string;
  /** Show Pinterest when the story has a strong visual. */
  image?: string;
  orientation?: "row" | "column";
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function ShareBar({ url, title, image, orientation = "row" }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const links = [
    { label: "Share on Facebook", short: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, d: "M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v6h4v-6h3l1-4h-4V8z" },
    { label: "Share on X", short: "X", href: `https://x.com/intent/post?url=${enc(url)}&text=${enc(title)}`, d: "M4 4l16 16M20 4L4 20" },
    { label: "Share on LinkedIn", short: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, d: "M6 9v11M6 5v.5M10 20v-6a3 3 0 0 1 6 0v6M10 9v11M18 20v-6" },
    ...(image
      ? [{ label: "Save to Pinterest", short: "Pinterest", href: `https://pinterest.com/pin/create/button/?url=${enc(url)}&media=${enc(image)}&description=${enc(title)}`, d: "M12 3a9 9 0 0 0-3 17.5l1-4.5c-.5-1-.5-2 0-3l1.5-6c.3-1 2-1.5 2.5 0 .3 1-.8 3-1 4.5s1 2.5 2.5 2.5c3 0 4.5-3 4.5-6a6 6 0 0 0-6-6z" }]
      : []),
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  const itemCls =
    "inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-navy-900 transition-colors hover:border-navy-900 hover:bg-navy-900 hover:text-white";

  return (
    <div className={`flex ${orientation === "column" ? "flex-col" : "flex-row flex-wrap"} items-center gap-2`} aria-label="Share this story">
      <span className="eyebrow mr-1 text-ink-500">Share</span>
      {links.map((l) => (
        <a key={l.short} href={l.href} target="_blank" rel="noopener noreferrer" className={itemCls} aria-label={l.label} title={l.short}>
          <Icon d={l.d} />
        </a>
      ))}
      <button type="button" onClick={copy} className={itemCls} aria-label={copied ? "Link copied" : "Copy link"} title="Copy link">
        {copied ? <Icon d="M5 12l5 5L20 7" /> : <Icon d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />}
      </button>
      <span role="status" aria-live="polite" className="sr-only">{copied ? "Link copied to clipboard" : ""}</span>
    </div>
  );
}
