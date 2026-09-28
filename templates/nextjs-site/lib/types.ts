export interface Img { src: string; alt: string; width: number; height: number; source?: string; credit?: { name: string; url: string }; variants?: { width: number; url: string }[] }
export interface Link { label: string; href: string }
export interface Common { id: string; tone: "dark" | "light" | "accent"; layout: string }

export interface SiteContent {
  brand: { name: string; logoUrl?: string; isPlaceholder: boolean };
  siteUrl: string;
  themeColor: string;
  fontsHref: string;
  seo: { title: string; description: string; keywords: string[]; ogTitle: string; ogDescription: string };
  contact: { phone?: string; email?: string; address?: string };
  nav: Link[];
  cta: Link;
  credits: { name: string; url: string }[];
  jsonLd: Record<string, unknown>;
  sections: (Common & { component: string; props: Record<string, unknown> })[];
}
