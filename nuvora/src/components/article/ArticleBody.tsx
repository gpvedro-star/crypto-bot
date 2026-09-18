import type { ContentBlock } from "@/content/types";
import { BottomLine, Callout, ComparisonTable, Explains, FAQ, Figure, Gallery, KeyTakeaways, ToolRecommendation, WhyItMatters } from "./EditorialBlocks";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Renders the typed content blocks of an article in order. */
export function ArticleBody({ blocks, id }: { blocks: ContentBlock[]; id?: string }) {
  return (
    <div id={id} className="article-body">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "paragraph":
            return <p key={i}>{block.text}</p>;
          case "heading": {
            const hid = block.id ?? slugify(block.text);
            return block.level === 2 ? <h2 key={i} id={hid}>{block.text}</h2> : <h3 key={i} id={hid}>{block.text}</h3>;
          }
          case "quote":
            return (
              <blockquote key={i}>
                <p>{block.text}</p>
                {block.cite && <cite>— {block.cite}</cite>}
              </blockquote>
            );
          case "list":
            return block.style === "number" ? (
              <ol key={i}>{block.items.map((it, j) => <li key={j}>{it}</li>)}</ol>
            ) : (
              <ul key={i}>{block.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
            );
          case "image":
            return <Figure key={i} image={block.image} size={block.size} />;
          case "gallery":
            return <Gallery key={i} images={block.images} caption={block.caption} />;
          case "table":
            return <ComparisonTable key={i} table={block.table} />;
          case "callout":
            return <Callout key={i} title={block.title} text={block.text} tone={block.tone} />;
          case "explains":
            return <Explains key={i} term={block.term} text={block.text} />;
          case "whyItMatters":
            return <WhyItMatters key={i} text={block.text} />;
          case "bottomLine":
            return <BottomLine key={i} text={block.text} />;
          case "keyTakeaways":
            return <KeyTakeaways key={i} items={block.items} />;
          case "faq":
            return <FAQ key={i} items={block.items} />;
          case "toolRecommendation":
            return <ToolRecommendation key={i} toolSlug={block.toolSlug} note={block.note} />;
          case "divider":
            return <hr key={i} className="my-12 border-line" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
