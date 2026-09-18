import Link from "next/link";
import type { Category } from "@/content/types";

export function CategoryCard({ category, count }: { category: Category; count: number }) {
  return (
    <Link
      href={`/${category.slug}`}
      className="card-lift group flex min-h-[132px] flex-col justify-between rounded-card border border-line bg-white p-5 transition-colors hover:border-navy-900"
    >
      <span className="font-serif text-[1.35rem] font-semibold text-navy-900">{category.name}</span>
      <span className="flex items-center justify-between font-sans text-[0.85rem] text-ink-500">
        {count} {count === 1 ? "story" : "stories"}
        <span aria-hidden="true" className="text-sky-500 transition-transform duration-300 group-hover:translate-x-1">→</span>
      </span>
    </Link>
  );
}
