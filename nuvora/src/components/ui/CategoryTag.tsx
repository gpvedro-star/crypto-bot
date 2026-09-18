import Link from "next/link";
import { categoryMap } from "@/content/categories";
import type { CategorySlug } from "@/content/types";

interface CategoryTagProps {
  category: CategorySlug;
  tone?: "light" | "dark";
  size?: "sm" | "md";
  asLink?: boolean;
}

export function CategoryTag({ category, tone = "light", size = "sm", asLink = true }: CategoryTagProps) {
  const cat = categoryMap[category];
  const cls = `eyebrow inline-block ${size === "md" ? "text-[0.8rem]" : "text-[0.72rem]"} ${
    tone === "dark" ? "text-sky-300" : "text-navy-700"
  }`;
  if (!asLink) return <span className={cls}>{cat.name}</span>;
  return (
    <Link href={`/${cat.slug}`} className={`${cls} link-underline pb-0.5`}>
      {cat.name}
    </Link>
  );
}
