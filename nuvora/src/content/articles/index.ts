import type { Article } from "../types";
import { newsArticles } from "./news";
import { toolsArticles } from "./tools";
import { everydayArticles } from "./everyday";
import { guideArticles } from "./guides";
import { workArticles } from "./work";
import { reviewArticles } from "./reviews";

/**
 * The article corpus. When a CMS or database replaces these files, only
 * lib/content.ts needs to change — components consume the Article type.
 */
export const allArticles: Article[] = [
  ...newsArticles,
  ...toolsArticles,
  ...everydayArticles,
  ...guideArticles,
  ...workArticles,
  ...reviewArticles,
];
