import Image from "next/image";
import type { Author } from "@/content/types";

export function Avatar({ author, size = 40, className = "" }: { author: Author; size?: number; className?: string }) {
  if (author.portrait) {
    return (
      <Image
        src={author.portrait.src}
        alt={author.portrait.alt}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-navy-900 font-serif font-semibold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {author.initials}
    </span>
  );
}
