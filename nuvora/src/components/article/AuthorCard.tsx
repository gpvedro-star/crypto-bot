import Link from "next/link";
import type { Author } from "@/content/types";
import { Avatar } from "@/components/ui/Avatar";

export function AuthorCard({ author }: { author: Author }) {
  return (
    <aside className="flex flex-col gap-5 rounded-card border border-line bg-white p-6 sm:flex-row sm:items-start" aria-label="About the author">
      <Avatar author={author} size={64} />
      <div>
        <p className="eyebrow text-ink-500">Written by</p>
        <p className="mt-1 font-serif text-[1.35rem] font-semibold text-navy-900">
          <Link href={`/authors/${author.slug}`} className="hover:underline">{author.name}</Link>
        </p>
        <p className="font-sans text-[0.9rem] text-ink-500">{author.role}</p>
        <p className="mt-3 font-sans text-[0.98rem] leading-relaxed text-ink-700">{author.bio}</p>
      </div>
    </aside>
  );
}
