import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./tokens.css";
import "./globals.css";
import { site } from "../lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.siteUrl),
  title: site.seo.title,
  description: site.seo.description,
  keywords: site.seo.keywords,
  alternates: { canonical: "/" },
  openGraph: { title: site.seo.ogTitle, description: site.seo.ogDescription, type: "website", siteName: site.brand.name, locale: "en_US" },
  twitter: { card: "summary_large_image", title: site.seo.ogTitle, description: site.seo.ogDescription },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: site.themeColor, width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={site.fontsHref} />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(site.jsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
