"use client";

import { useId, useState, type FormEvent } from "react";

interface NewsletterFormProps {
  compact?: boolean;
  tone?: "light" | "dark";
  source?: string;
  buttonLabel?: string;
}

type Status = "idle" | "submitting" | "success" | "error";

export function NewsletterForm({ compact = false, tone = "light", source = "site", buttonLabel = "Join NUVORA" }: NewsletterFormProps) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const dark = tone === "dark";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/v1/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await res.json()) as { message?: string; error?: { message: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "Something went wrong.");
      setStatus("success");
      setMessage(data.message ?? "You're on the list. Welcome to NUVORA.");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <p role="status" className={`rounded-[4px] px-4 py-3 font-sans text-[0.95rem] ${dark ? "bg-white/10 text-white" : "bg-sky-100 text-navy-900"}`}>
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "flex flex-col gap-2 sm:flex-row" : "flex flex-col gap-3 sm:flex-row"} noValidate>
      <label htmlFor={id} className="sr-only">
        Email address
      </label>
      <input
        id={id}
        type="email"
        name="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={status === "error" || undefined}
        aria-describedby={status === "error" ? `${id}-msg` : undefined}
        className={`w-full rounded-[4px] border px-4 font-sans text-[1rem] outline-none transition-colors ${
          compact ? "min-h-[48px]" : "min-h-[54px]"
        } ${
          dark
            ? "border-white/25 bg-white/10 text-white placeholder:text-white/50 focus:border-sky-300 focus:bg-white/15"
            : "border-line-strong bg-white text-ink-900 placeholder:text-ink-400 focus:border-navy-900"
        }`}
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className={`shrink-0 rounded-[4px] px-5 font-sans font-semibold transition-colors disabled:opacity-60 ${
          compact ? "min-h-[48px] text-[0.95rem]" : "min-h-[54px] text-[1rem]"
        } ${dark ? "bg-white text-navy-900 hover:bg-sky-100" : "bg-navy-900 text-white hover:bg-navy-800"}`}
      >
        {status === "submitting" ? "Joining…" : buttonLabel}
      </button>
      {status === "error" && (
        <p id={`${id}-msg`} role="alert" className={`basis-full font-sans text-[0.9rem] ${dark ? "text-sky-200" : "text-red-700"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
