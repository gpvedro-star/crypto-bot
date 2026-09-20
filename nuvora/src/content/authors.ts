import type { Author } from "./types";

/**
 * Bylines.
 *
 * These are demonstration records carried by the article template until the
 * real NUVORA contributors are in place. They therefore describe a beat and
 * nothing else: no career history, previous employers, tenure, credentials or
 * founding roles. Those claims were invented during development and asserting
 * them would present fictional people as credentialled journalists.
 *
 * When real contributors are added, `bio` may carry genuine, verifiable
 * background. The component architecture already supports it.
 */
export const authors: Author[] = [
  {
    slug: "margaret-hale",
    name: "Margaret Hale",
    role: "Editor in Chief",
    initials: "MH",
    bio: "Oversees NUVORA's coverage and writes the main explainers on what a change in AI actually means for readers.",
  },
  {
    slug: "daniel-reyes",
    name: "Daniel Reyes",
    role: "Senior Tools Editor",
    initials: "DR",
    bio: "Covers the AI tools desk: what each tool does, who it suits and what it costs.",
  },
  {
    slug: "priya-natarajan",
    name: "Priya Natarajan",
    role: "Everyday AI Correspondent",
    initials: "PN",
    bio: "Writes about the small, practical ways AI fits into ordinary life at home and on the move.",
  },
  {
    slug: "thomas-whitfield",
    name: "Thomas Whitfield",
    role: "Work & Careers Editor",
    initials: "TW",
    bio: "Covers how AI is changing offices, professions and careers.",
  },
  {
    slug: "nuvora-staff",
    name: "NUVORA Staff",
    role: "Editorial Team",
    initials: "N",
    bio: "Written and edited by NUVORA.",
  },
];

export function getAuthor(slug: string): Author | undefined {
  return authors.find((a) => a.slug === slug);
}
