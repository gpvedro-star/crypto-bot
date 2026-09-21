import Link from "next/link";
import { categoryMap } from "@/content/categories";
import type { CategorySlug } from "@/content/types";

interface CategoryTagProps {
  category: CategorySlug;
  tone?: "light" | "dark" | "overlay";
  /** `pill` for cards and grids; `text` for editorial section labels. */
  variant?: "pill" | "text";
  asLink?: boolean;
  className?: string;
}

const pillTones = {
  light: "bg-sky-100 text-navy-800 hover:bg-sky-300/60",
  dark: "bg-white/12 text-sky-300 hover:bg-white/20",
  overlay: "bg-white/90 text-navy-900 backdrop-blur-sm hover:bg-white",
};

const textTones = {
  light: "text-navy-700 hover:text-navy-900",
  dark: "text-sky-300 hover:text-white",
  overlay: "text-white hover:text-sky-100",
};

/**
 * Category label. `pill` on cards, `text` for print-style section labels.
 *
 * The text variant is 14px of type. A transparent pseudo-element extends its
 * tap target to 24px (WCAG 2.5.8) without touching layout — padding and margin
 * would collide with the mt-* classes callers pass in.
 */
export function CategoryTag({ category, tone = "light", variant = "pill", asLink = true, className = "" }: CategoryTagProps) {
  const cat = categoryMap[category];
  const cls =
    variant === "pill"
      ? `pill transition-colors ${pillTones[tone]} ${className}`
      : `eyebrow relative inline-block transition-colors before:absolute before:inset-x-0 before:-inset-y-[5px] ${textTones[tone]} ${className}`;
  if (!asLink) return <span className={cls}>{cat.name}</span>;
  return (
    <Link href={`/${cat.slug}`} className={cls}>
      {cat.name}
    </Link>
  );
}
