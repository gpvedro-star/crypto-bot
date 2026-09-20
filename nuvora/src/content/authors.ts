import type { Author } from "./types";

/**
 * Bylines.
 *
 * Demonstration content is attributed to the publication, not to invented
 * people. The four fictional staff profiles that used to live here presented
 * made-up individuals as working journalists, which is a credibility claim
 * NUVORA cannot support.
 *
 * The record shape is unchanged, so real contributors can be added alongside
 * this one with a `role`, a genuine `bio` and a `portrait` when they exist.
 */
export const BRAND_BYLINE_SLUG = "nuvora";

export const authors: Author[] = [
  {
    slug: BRAND_BYLINE_SLUG,
    name: "NUVORA",
    initials: "N",
    bio: "NUVORA explains artificial intelligence to normal people — clearly, calmly and practically. The magazine is produced with an AI-assisted editorial workflow; our AI usage policy sets out what that involves.",
  },
];

export function getAuthor(slug: string): Author | undefined {
  return authors.find((a) => a.slug === slug);
}
