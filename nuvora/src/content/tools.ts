import type { AITool } from "./types";

/**
 * AI tool directory. Descriptions are editorial placeholders written in the
 * NUVORA voice; pricing and verdicts are marked for editorial verification
 * before publication.
 */
export const tools: AITool[] = [
  {
    slug: "chatgpt",
    name: "ChatGPT",
    maker: "OpenAI",
    monogram: "C",
    tagline: "The assistant most people have already heard of.",
    description:
      "ChatGPT is a conversational assistant you type to in plain English. Ask it to explain something, draft a letter, summarize a document, or talk through a decision, and it replies in full sentences.",
    category: "assistant",
    whoItsFor: ["People trying AI for the first time", "Anyone who writes emails, letters or plans", "Households that want one general-purpose tool"],
    bestUses: ["Drafting and rewriting", "Explaining unfamiliar topics", "Planning trips, meals and schedules", "Talking through decisions"],
    pricing: [
      { name: "Free", price: "$0", note: "Core features with usage limits" },
      { name: "Plus", price: "$20 / month", note: "Editorial placeholder — verify current pricing" },
    ],
    pros: ["Easy to start", "Works on phone, web and desktop", "Handles a very wide range of tasks"],
    cons: ["Can state things confidently that are wrong", "Free tier has limits during busy periods"],
    verdict: "NUVORA verdict placeholder: a full hands-on verdict is written and reviewed by the tools desk before publication.",
    officialUrl: "https://chatgpt.com",
    affiliateId: "chatgpt-plus",
    updatedAt: "2026-09-15T14:00:00Z",
    featured: true,
  },
  {
    slug: "claude",
    name: "Claude",
    maker: "Anthropic",
    monogram: "Cl",
    tagline: "A careful, thoughtful assistant that is strong with long documents.",
    description:
      "Claude is a conversational assistant known for a measured tone and for working well with long documents. Many people use it for writing, summarizing and thinking through complicated questions.",
    category: "assistant",
    whoItsFor: ["Readers and writers", "People working with long reports or contracts", "Anyone who prefers a calm, careful tone"],
    bestUses: ["Summarizing long documents", "Editing and improving writing", "Structured thinking and research"],
    pricing: [
      { name: "Free", price: "$0", note: "Core features with usage limits" },
      { name: "Pro", price: "$20 / month", note: "Editorial placeholder — verify current pricing" },
    ],
    pros: ["Handles very long documents", "Clear, well-organized answers", "Measured tone"],
    cons: ["Fewer consumer add-ons than some rivals", "Free usage limits can be reached quickly"],
    verdict: "NUVORA verdict placeholder: a full hands-on verdict is written and reviewed by the tools desk before publication.",
    officialUrl: "https://claude.ai",
    affiliateId: "claude-pro",
    updatedAt: "2026-09-12T14:00:00Z",
    featured: true,
  },
  {
    slug: "gemini",
    name: "Gemini",
    maker: "Google",
    monogram: "G",
    tagline: "Google's assistant, built into the apps you may already use.",
    description:
      "Gemini is Google's AI assistant. It is available on its own and increasingly inside Gmail, Docs, Android phones and Google Search, which makes it convenient for people who already live in Google's world.",
    category: "assistant",
    whoItsFor: ["Gmail and Google Docs users", "Android phone owners", "People who want AI inside tools they already have"],
    bestUses: ["Summarizing email threads", "Drafting inside Google Docs", "Questions that benefit from up-to-date web results"],
    pricing: [
      { name: "Free", price: "$0" },
      { name: "Google AI Pro", price: "$19.99 / month", note: "Editorial placeholder — verify current pricing" },
    ],
    pros: ["Deep integration with Google apps", "Strong with current information", "Often included with existing subscriptions"],
    cons: ["Feature names change often", "Quality varies between the standalone app and in-app versions"],
    verdict: "NUVORA verdict placeholder: a full hands-on verdict is written and reviewed by the tools desk before publication.",
    officialUrl: "https://gemini.google.com",
    affiliateId: "gemini-advanced",
    updatedAt: "2026-09-10T14:00:00Z",
    featured: true,
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    maker: "Perplexity AI",
    monogram: "P",
    tagline: "A search engine that answers in sentences and shows its sources.",
    description:
      "Perplexity is best understood as an AI-powered search engine. You ask a question, it reads the web, and it writes an answer with numbered citations you can check.",
    category: "search",
    whoItsFor: ["People who want answers with sources", "Researchers, students and the curious", "Anyone frustrated by ad-heavy search results"],
    bestUses: ["Researching a purchase", "Quick factual questions", "Understanding a news story with sources"],
    pricing: [
      { name: "Free", price: "$0" },
      { name: "Pro", price: "$20 / month", note: "Editorial placeholder — verify current pricing" },
    ],
    pros: ["Shows its sources", "Fast and focused", "Good for current events"],
    cons: ["Less useful for creative writing", "Sources still need a human sanity check"],
    verdict: "NUVORA verdict placeholder: a full hands-on verdict is written and reviewed by the tools desk before publication.",
    officialUrl: "https://www.perplexity.ai",
    affiliateId: "perplexity-pro",
    updatedAt: "2026-09-08T14:00:00Z",
    featured: true,
  },
  {
    slug: "grok",
    name: "Grok",
    maker: "xAI",
    monogram: "Gr",
    tagline: "The assistant built into X, with a more casual voice.",
    description:
      "Grok is the AI assistant from xAI. It is available inside X (formerly Twitter) and as a standalone app, and is known for a more informal tone and access to real-time posts on X.",
    category: "assistant",
    whoItsFor: ["Regular X users", "People who want real-time social context", "Those who prefer a more casual assistant"],
    bestUses: ["Following live conversations on X", "Quick explanations with a lighter tone", "General questions"],
    pricing: [
      { name: "Free", price: "$0", note: "Limited access" },
      { name: "Premium", price: "Varies", note: "Editorial placeholder — verify current pricing" },
    ],
    pros: ["Real-time access to X", "Distinct personality"],
    cons: ["Tone will not suit everyone", "Tied closely to one platform"],
    verdict: "NUVORA verdict placeholder: a full hands-on verdict is written and reviewed by the tools desk before publication.",
    officialUrl: "https://grok.com",
    affiliateId: "grok",
    updatedAt: "2026-09-05T14:00:00Z",
  },
  {
    slug: "copilot",
    name: "Microsoft Copilot",
    maker: "Microsoft",
    monogram: "Co",
    tagline: "Microsoft's assistant, woven into Windows and Office.",
    description:
      "Copilot is Microsoft's AI assistant. It appears in Windows, Edge, and the Microsoft 365 apps such as Word, Excel and Outlook, which makes it a natural choice for office workers.",
    category: "productivity",
    whoItsFor: ["Office workers using Microsoft 365", "Windows users", "Teams that want AI inside Word and Excel"],
    bestUses: ["Summarizing Outlook email", "Drafting in Word", "Explaining and building Excel formulas"],
    pricing: [
      { name: "Free", price: "$0" },
      { name: "Microsoft 365 Copilot", price: "Varies", note: "Editorial placeholder — verify current pricing" },
    ],
    pros: ["Built into tools millions already use", "Strong for office documents"],
    cons: ["Confusing mix of free and paid versions", "Quality depends on which Copilot you are using"],
    verdict: "NUVORA verdict placeholder: a full hands-on verdict is written and reviewed by the tools desk before publication.",
    officialUrl: "https://copilot.microsoft.com",
    affiliateId: "copilot",
    updatedAt: "2026-09-02T14:00:00Z",
  },
];

export function getTool(slug: string): AITool | undefined {
  return tools.find((t) => t.slug === slug);
}
