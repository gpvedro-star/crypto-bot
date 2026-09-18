import { ImageResponse } from "next/og";
import { getAllArticles, getArticle } from "@/lib/content";
import { categoryMap } from "@/content/categories";

export const alt = "NUVORA story";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export default async function ArticleOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  const title = article?.title ?? "NUVORA";
  const category = article ? categoryMap[article.category].name : "";
  const author = article?.author.name ?? "";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#F8F9FB", color: "#0B2D5B", padding: 64, fontFamily: "serif", borderTop: "16px solid #0B2D5B" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "sans-serif" }}>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, fontWeight: 700 }}>NUVORA</div>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, color: "#1B4C8C", textTransform: "uppercase" }}>{category}</div>
        </div>
        <div style={{ display: "flex", fontSize: title.length > 60 ? 58 : 70, lineHeight: 1.06, fontWeight: 700, maxWidth: 1040 }}>{title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "sans-serif", fontSize: 24, color: "#5C6979" }}>
          <div>{author}</div>
          <div style={{ display: "flex", color: "#5BA9E6" }}>AI for Normal People.</div>
        </div>
      </div>
    ),
    size,
  );
}
