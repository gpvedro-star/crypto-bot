import type { Author } from "./types";

export const authors: Author[] = [
  {
    slug: "margaret-hale",
    name: "Margaret Hale",
    role: "Editor in Chief",
    initials: "MH",
    bio: "Margaret spent two decades at national newspapers before founding NUVORA's newsroom. She believes any technology worth using can be explained at a kitchen table.",
    social: { x: "https://x.com/nuvora", linkedin: "https://linkedin.com/company/nuvora" },
  },
  {
    slug: "daniel-reyes",
    name: "Daniel Reyes",
    role: "Senior Tools Editor",
    initials: "DR",
    bio: "Daniel tests every AI tool NUVORA writes about and keeps a running spreadsheet of what actually works. Previously a product reviewer at a consumer technology magazine.",
  },
  {
    slug: "priya-natarajan",
    name: "Priya Natarajan",
    role: "Everyday AI Correspondent",
    initials: "PN",
    bio: "Priya writes about the small, practical ways AI fits into ordinary life. She spent ten years covering consumer technology and personal finance.",
  },
  {
    slug: "thomas-whitfield",
    name: "Thomas Whitfield",
    role: "Work & Careers Editor",
    initials: "TW",
    bio: "Thomas covers how AI is changing offices, professions and careers. He was previously a business correspondent and a workplace columnist.",
  },
  {
    slug: "nuvora-staff",
    name: "NUVORA Staff",
    role: "Editorial Team",
    initials: "N",
    bio: "Reported and edited by the NUVORA editorial team.",
  },
];

export function getAuthor(slug: string): Author | undefined {
  return authors.find((a) => a.slug === slug);
}
