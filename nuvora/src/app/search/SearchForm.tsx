"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchForm({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search");
      }}
    >
      <label htmlFor="site-search" className="sr-only">Search NUVORA</label>
      <input
        id="site-search"
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search stories, tools and guides"
        autoComplete="off"
        className="min-h-[56px] w-full rounded-[4px] border border-line-strong bg-white px-5 font-sans text-[1.1rem] text-ink-900 outline-none placeholder:text-ink-400 focus:border-navy-900"
      />
      <button type="submit" className="min-h-[56px] shrink-0 rounded-[4px] bg-navy-900 px-6 font-sans font-semibold text-white transition-colors hover:bg-navy-800">
        Search
      </button>
    </form>
  );
}
