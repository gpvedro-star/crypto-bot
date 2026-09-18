import type { Guide } from "./types";

export const guides: Guide[] = [
  {
    slug: "ai-beginners-guide",
    title: "The AI Beginner's Guide",
    description: "What AI is, what it is not, and how to try it for the first time without feeling lost.",
    articleSlug: "you-dont-need-to-be-a-tech-expert-to-use-ai",
    level: "Beginner",
    image: { src: "/images/guides/beginners.svg", alt: "Abstract navy composition with a single light-blue arc", width: 1200, height: 900 },
  },
  {
    slug: "best-ai-tools-everyday-life",
    title: "The Best AI Tools for Everyday Life",
    description: "A calm comparison of the tools worth knowing, and which one to start with.",
    articleSlug: "claude-vs-chatgpt-what-normal-people-need-to-know",
    level: "Everyday",
    image: { src: "/images/guides/tools.svg", alt: "Grid of soft rectangles in navy and paper tones", width: 1200, height: 900 },
  },
  {
    slug: "how-to-start-using-ai-today",
    title: "How to Start Using AI Today",
    description: "Five small, useful things you can do this afternoon with a free AI assistant.",
    articleSlug: "7-ways-ai-can-save-you-time-this-week",
    level: "Practical",
    image: { src: "/images/guides/start.svg", alt: "Rising light-blue line across a navy field", width: 1200, height: 900 },
  },
  {
    slug: "ai-safety-for-normal-people",
    title: "AI Safety for Normal People",
    description: "Scams, privacy and mistakes: the practical habits that keep you safe.",
    articleSlug: "how-to-use-ai-safely",
    level: "Safety",
    image: { src: "/images/guides/safety.svg", alt: "Concentric rings in navy with a light-blue centre", width: 1200, height: 900 },
  },
];
