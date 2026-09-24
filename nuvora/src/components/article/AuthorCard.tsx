import Link from "next/link";
import type { Author } from "@/content/types";
import { Avatar } from "@/components/ui/Avatar";

/** Closing byline note. Ruled type rather than a card, to match the opening. */
export function AuthorCard({ author }: { author: Author }) {
  return (
    <aside className="flex items-start gap-4 border-t border-line pt-6" aria-label="About the byline">
      <Avatar author={author} size={40} />
      <div>
        <p className="font-sans text-[0.95rem] text-ink-900">
          <Link href={`/authors/${author.slug}`} className="relative before:absolute before:inset-x-0 before:-inset-y-[5px] font-semibold underline decoration-transparent underline-offset-[3px] hover:decoration-navy-900">
            {author.name}
          </Link>
          {author.role && <span className="text-ink-500"> — {author.role}</span>}
        </p>
        <p className="mt-1.5 max-w-[60ch] font-sans text-[0.92rem] leading-relaxed text-ink-700">{author.bio}</p>
      </div>
    </aside>
  );
}
