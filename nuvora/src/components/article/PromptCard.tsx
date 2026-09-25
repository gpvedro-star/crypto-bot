"use client";

import { useId, useRef, useState } from "react";

type Status = { kind: "idle" } | { kind: "copied" } | { kind: "error" };

/** Square-bracket placeholders are shown distinctly but copied exactly as written. */
function withPlaceholders(text: string) {
  return text.split(/(\[[^\]\n]{1,300}\])/g).map((part, i) =>
    /^\[[^\]]+\]$/.test(part) ? (
      <span key={i} className="rounded-[3px] bg-sky-50 px-0.5 text-navy-800 [box-decoration-break:clone]">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/**
 * A prompt the reader can copy. The prompt is ordinary selectable text; the
 * button is a convenience, and when the clipboard is unavailable it selects
 * the text and says how to copy it by hand.
 */
export function PromptCard({ title, text, number }: { title: string; text: string; number?: number }) {
  const id = useId();
  const textRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function selectText() {
    const el = textRef.current;
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setStatus({ kind: "copied" });
      timer.current = setTimeout(() => setStatus({ kind: "idle" }), 4000);
    } catch {
      selectText();
      setStatus({ kind: "error" });
    }
  }

  const label = number ? `Prompt ${number}` : "Prompt";

  return (
    <figure className="not-prose my-10 rounded-[6px] border border-line bg-white" aria-labelledby={`${id}-title`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {number !== undefined && (
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 font-sans text-[0.9rem] font-semibold text-white tabular"
            >
              {number}
            </span>
          )}
          <p id={`${id}-title`} className="min-w-0 font-sans leading-snug">
            <span className="block text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-ink-500">{label}</span>
            <span className="block text-[1.05rem] font-semibold text-navy-900">{title}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-describedby={`${id}-status`}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-[4px] border border-navy-900 px-3.5 font-sans text-[0.9rem] font-semibold text-navy-900 transition-colors hover:bg-navy-900 hover:text-white"
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {status.kind === "copied" ? (
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            ) : (
              <>
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V6a2 2 0 0 1 2-2h9" />
              </>
            )}
          </svg>
          {status.kind === "copied" ? "Copied" : "Copy prompt"}
        </button>
      </div>

      <div
        ref={textRef}
        className="whitespace-pre-wrap px-5 py-5 font-sans text-[1.0625rem] leading-[1.65] text-ink-900 sm:px-6 sm:text-[1.125rem]"
      >
        {withPlaceholders(text)}
      </div>

      <p
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        className={`px-5 font-sans text-[0.9rem] sm:px-6 ${status.kind === "idle" ? "sr-only" : "pb-4"} ${status.kind === "error" ? "text-navy-900" : "text-ink-700"}`}
      >
        {status.kind === "copied" && "Prompt copied. Paste it into your AI assistant and replace the words in brackets."}
        {status.kind === "error" && "Couldn't copy automatically. The prompt is now selected: press Ctrl+C (or Command+C on a Mac) to copy it."}
      </p>
    </figure>
  );
}
