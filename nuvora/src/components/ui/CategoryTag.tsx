import Link from "next/link";
import { categoryMap } from "@/content/categories";
import type { CategorySlug } from "@/content/types";

interface CategoryTagProps {
  category: CategorySlug;
  tone?: "light" | "dark" | "overlay";
  asLink?: boolean;
  className?: string;
}

const tones = {
  light: "bg-sky-100 text-navy-800 hover:bg-sky-300/60",
  dark: "bg-white/12 text-sky-300 hover:bg-white/20",
  overlay: "bg-white/90 text-navy-900 backdrop-blur-sm hover:bg-white",
};

/** Category pill. */
export function CategoryTag({ category, tone = "light", asLink = true, className = "" }: CategoryTagProps) {
  const cat = categoryMap[category];
  const cls = `pill transition-colors ${tones[tone]} ${className}`;
  if (!asLink) return <span className={cls}>{cat.name}</span>;
  return (
    <Link href={`/${cat.slug}`} className={cls}>
      {cat.name}
    </Link>
  );
}
