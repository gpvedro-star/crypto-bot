import Link from "next/link";
import { getLatest } from "@/lib/content";
import { CompactCard } from "@/components/cards/CompactCard";
import { Logo } from "@/components/brand/Logo";

export default function NotFound() {
  const latest = getLatest(4);
  return (
    <div className="container-x py-20 sm:py-28">
      <div className="mx-auto max-w-2xl text-center text-navy-900">
        <Logo variant="mark" height={56} />
        <p className="eyebrow mt-6 text-ink-500">404</p>
        <h1 className="headline mt-3 text-[2.4rem] sm:text-[3rem]">We couldn&apos;t find that page.</h1>
        <p className="mt-4 text-[1.1rem] text-ink-700">It may have moved, or the link may be out of date. Here are a few places to go next.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex min-h-[46px] items-center rounded-[4px] bg-navy-900 px-5 font-sans font-semibold text-white hover:bg-navy-800">Go to the front page</Link>
          <Link href="/search" className="inline-flex min-h-[46px] items-center rounded-[4px] border border-navy-900 px-5 font-sans font-semibold text-navy-900 hover:bg-navy-900 hover:text-white">Search NUVORA</Link>
        </div>
      </div>
      <div className="mx-auto mt-16 max-w-2xl border-t-2 border-navy-900 pt-4">
        <p className="eyebrow text-navy-900">Latest stories</p>
        <ul className="mt-2 divide-y divide-line">
          {latest.map((a) => (
            <li key={a.slug} className="py-5"><CompactCard article={a} /></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
