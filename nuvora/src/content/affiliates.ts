import type { AffiliateLink } from "./types";

/**
 * Central affiliate registry.
 *
 * Components never embed partner URLs. They call resolveAffiliate(id) from
 * lib/affiliates.ts, which returns the active destination and the correct
 * rel attributes. Toggle `active` to switch a partnership on or off site-wide.
 *
 * Every URL below is a placeholder pointing at the tool's public site until a
 * partnership agreement is in place.
 */
export const affiliateLinks: AffiliateLink[] = [
  { id: "chatgpt-plus", label: "Try ChatGPT", url: "https://chatgpt.com", partner: "OpenAI", active: false, fallbackUrl: "https://chatgpt.com" },
  { id: "claude-pro", label: "Try Claude", url: "https://claude.ai", partner: "Anthropic", active: false, fallbackUrl: "https://claude.ai" },
  { id: "gemini-advanced", label: "Try Gemini", url: "https://gemini.google.com", partner: "Google", active: false, fallbackUrl: "https://gemini.google.com" },
  { id: "perplexity-pro", label: "Try Perplexity", url: "https://www.perplexity.ai", partner: "Perplexity", active: false, fallbackUrl: "https://www.perplexity.ai" },
  { id: "grok", label: "Try Grok", url: "https://grok.com", partner: "xAI", active: false, fallbackUrl: "https://grok.com" },
  { id: "copilot", label: "Try Copilot", url: "https://copilot.microsoft.com", partner: "Microsoft", active: false, fallbackUrl: "https://copilot.microsoft.com" },
];
