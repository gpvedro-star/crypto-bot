import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { authors, getArticlesByAuthor, getAuthor } from "@/lib/content";
import { buildMetadata, breadcrumbSchema, absoluteUrl } from "@/lib/seo";
import { JsonLd } from "@/components/ui/JsonLd";
import { Breadcrumbs } from "@/components/article/Breadcrumbs";
import { Avatar } from "@/components/ui/Avatar";
import { HorizontalCard } from "@/components/cards/HorizontalCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { NewsletterBlock } from "@/components/sections/NewsletterBlock";

interface Params { slug: string }

export function generateStaticParams(): Params[] {
  return authors.map((a) => ({ slug: a.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) return {};
  // The publication byline has no job title, and "NUVORA | NUVORA" reads badly
  // once the title template appends the site name.
  const title = author.role ? `${author.name}, ${author.role}` : `Stories by ${author.name}`;
  return buildMetadata({ title, description: author.bio, path: `/authors/${slug}` });
}

export default async function AuthorPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) notFound();
  const stories = getArticlesByAuthor(slug);
  return (
    <>
      <JsonLd data={[
        breadcrumbSchema([{ name: "Home", path: "/" }, { name: author.name, path: `/authors/${slug}` }]),
        { "@context": "https://schema.org", "@type": "Organization", name: author.name, description: author.bio, url: absoluteUrl(`/authors/${slug}`) },
      ]} />
      <div className="container-x">
        <Breadcrumbs items={[{ name: "Authors" }, { name: author.name }]} />
        <header className="flex flex-col gap-6 border-b border-line pb-10 pt-8 sm:flex-row sm:items-center sm:gap-8">
          <Avatar author={author} size={96} />
          <div>
            {author.role && <p className="eyebrow text-navy-700">{author.role}</p>}
            <h1 className="headline mt-1 text-[2.4rem] sm:text-[3rem]">{author.name}</h1>
            <p className="mt-3 max-w-2xl text-[1.08rem] leading-relaxed text-ink-700">{author.bio}</p>
          </div>
        </header>
      </div>
      {stories.length > 0 && (
      <section className="container-x mt-12" aria-labelledby="author-stories">
        <SectionHeading title={`Stories by ${author.name}`} kicker={`${stories.length} ${stories.length === 1 ? "story" : "stories"}`} />
        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-12">
          {stories.map((a, i) => (
            <Reveal key={a.slug} delay={(i % 2) * 70}><HorizontalCard article={a} /></Reveal>
          ))}
        </div>
      </section>
      )}
      <div className="mt-20"><NewsletterBlock source={`author-${slug}`} /></div>
    </>
  );
}
