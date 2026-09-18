import Link from "next/link";
import type { Category } from "@/content/types";

export function CategoryCard({ category, count }: { category: Category; count: number }) {
  return (
    <Link
      href={`/${category.slug}`}
      className="card-lift group flex min-h-[140px] flex-col justify-between rounded-card border border-line bg-white p-6 transition-colors hover:border-navy-900"
    >
      <span className="title text-[1.3rem] text-navy-900">{category.name}</span>
      <span className="flex items-center justify-between font-sans text-[0.85rem] text-ink-500">
        {count} {count === 1 ? "story" : "stories"}
        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-navy-900 transition-transform duration-300 group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}
