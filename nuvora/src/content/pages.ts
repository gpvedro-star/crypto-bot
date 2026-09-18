import { site } from "./site";

export interface StaticPageSection {
  heading?: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface StaticPage {
  slug: string;
  title: string;
  kicker: string;
  intro: string;
  seoDescription: string;
  updatedAt: string;
  sections: StaticPageSection[];
}

/**
 * Trust and legal pages. Legal text is an editorial placeholder and must be
 * reviewed by counsel before launch.
 */
export const staticPages: StaticPage[] = [
  {
    slug: "about",
    title: "About NUVORA",
    kicker: "Who we are",
    intro: "NUVORA is an American digital magazine that explains artificial intelligence to normal people — clearly, calmly and practically.",
    seoDescription: "NUVORA is an American digital magazine that explains artificial intelligence clearly, calmly and practically for normal people.",
    updatedAt: "2026-09-01",
    sections: [
      { heading: "Why we exist", paragraphs: ["Artificial intelligence is becoming part of everyday life — in email, in phones, in the office and at the kitchen table. Most coverage is written either for engineers or for investors. Almost none is written for the intelligent, curious adult who simply wants to understand what is happening and what to do about it.", "NUVORA is written for that person. Our readers are smart. They are not necessarily technical. They do not need to be."] },
      { heading: "What we believe", paragraphs: ["Any technology worth using can be explained at a kitchen table. Trust is earned with clarity, not with confidence. And the most valuable thing we can give a reader is the feeling of finally understanding something."], bullets: ["We explain, we do not hype.", "We test what we write about.", "We say when we do not know.", "We correct our mistakes in public."] },
      { heading: "Who makes NUVORA", paragraphs: [`NUVORA is published by ${site.publisher.legalName}, based in ${site.publisher.address}. Our editors come from national newspapers, consumer technology magazines and business journalism. Meet the team on our author pages.`] },
    ],
  },
  {
    slug: "editorial-standards",
    title: "Editorial Standards",
    kicker: "How we work",
    intro: "The rules our editors follow so that what you read on NUVORA is accurate, independent and clearly explained.",
    seoDescription: "NUVORA's editorial standards: accuracy, independence, clarity and how we handle sources, testing, corrections and sponsored content.",
    updatedAt: "2026-09-01",
    sections: [
      { heading: "Accuracy", paragraphs: ["Every factual claim is checked against a primary source before publication. Where a fact cannot be verified, we say so. Where an AI tool's behaviour is described, an editor has reproduced it."] },
      { heading: "Independence", paragraphs: ["No company sees a story before it is published. Advertisers and affiliate partners have no influence over what we cover or what we conclude. Sponsored content is labelled as such and produced separately from the newsroom."] },
      { heading: "Testing", paragraphs: ["We do not publish reviews of tools we have not used. Our tools desk keeps a written testing log for every product we cover, and verdicts are reviewed by a second editor."] },
      { heading: "Clarity", paragraphs: ["We write for an intelligent adult who is not a specialist. Technical terms are explained the first time they appear. If a passage cannot be understood without prior knowledge, it is rewritten."] },
      { heading: "Corrections", paragraphs: ["When we get something wrong, we fix it quickly and note the change. See our corrections policy for details."] },
    ],
  },
  {
    slug: "ai-usage-policy",
    title: "AI Usage Policy",
    kicker: "How we use AI ourselves",
    intro: "A magazine about AI should be transparent about its own use of it. Here is exactly how AI tools are and are not used at NUVORA.",
    seoDescription: "How NUVORA uses — and does not use — artificial intelligence in its own editorial process.",
    updatedAt: "2026-09-01",
    sections: [
      { heading: "What we use AI for", paragraphs: ["Our editors use AI assistants the way we recommend readers do: for research summaries, transcription, first drafts of routine text, and formatting. We also use automated systems to prepare social media versions of published stories."], bullets: ["Research and summarization, always verified by an editor", "Transcribing interviews", "Adapting published stories for social platforms", "Suggesting headlines, which editors choose between and rewrite"] },
      { heading: "What we do not use AI for", paragraphs: ["No story is published without a named human editor reading and approving every sentence. AI does not decide what we cover, does not form our verdicts, and does not invent quotes, facts or sources."] },
      { heading: "Images", paragraphs: ["Illustrations may be produced with the help of AI image tools and are labelled as illustrations. We do not publish AI-generated images presented as photographs of real events."] },
      { heading: "Disclosure", paragraphs: ["Where AI contributed materially to the drafting of a story, we say so at the end of the piece."] },
    ],
  },
  {
    slug: "corrections",
    title: "Corrections Policy",
    kicker: "When we get it wrong",
    intro: "AI changes quickly and so do the facts. When we make a mistake, we correct it promptly and transparently.",
    seoDescription: "NUVORA's corrections policy: how we fix errors and how to report one.",
    updatedAt: "2026-09-01",
    sections: [
      { heading: "How corrections work", paragraphs: ["Factual errors are corrected as soon as they are confirmed. Significant corrections are noted at the bottom of the story with the date. Minor fixes to spelling or style are made without a note.", "Every story displays both its original publication date and the date it was last updated, so you can always see how fresh it is."] },
      { heading: "Report an error", paragraphs: [`Email ${site.publisher.email} with the story link and the correction. An editor reads every message.`] },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    kicker: "Get in touch",
    intro: "We read every message. Here is the best way to reach the right person.",
    seoDescription: "Contact the NUVORA editorial team.",
    updatedAt: "2026-09-01",
    sections: [
      { heading: "Editorial", paragraphs: [`Story ideas, corrections and questions for our editors: ${site.publisher.email}`] },
      { heading: "Partnerships and advertising", paragraphs: ["For sponsorship, advertising and partnership enquiries, please write to partnerships@nuvora.com. Commercial partners never influence editorial coverage."] },
      { heading: "Press", paragraphs: ["Journalists may contact press@nuvora.com."] },
      { heading: "Mail", paragraphs: [`${site.publisher.legalName}, ${site.publisher.address}`] },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    kicker: "Your data",
    intro: "This policy explains what information NUVORA collects, why, and the choices you have. It is written in plain English on purpose.",
    seoDescription: "NUVORA privacy policy.",
    updatedAt: "2026-09-01",
    sections: [
      { heading: "What we collect", paragraphs: ["If you subscribe to our newsletter, we store your email address and the date you joined. If you contact us, we keep your message. We use privacy-respecting analytics to understand which stories are read; this data is aggregated and does not identify you personally."] },
      { heading: "What we do not do", paragraphs: ["We do not sell your personal information. We do not share your email address with advertisers or partners."] },
      { heading: "Cookies", paragraphs: ["We use only the cookies needed for the site to function and for aggregate analytics. Advertising partners, when introduced, will be listed here with their own policies."] },
      { heading: "Your choices", paragraphs: [`You can unsubscribe from any email with one click, and you can ask us to delete your information at any time by writing to ${site.publisher.email}.`] },
      { paragraphs: ["This document is an editorial placeholder and will be reviewed by legal counsel before launch."] },
    ],
  },
  {
    slug: "terms",
    title: "Terms of Use",
    kicker: "The fine print",
    intro: "By using NUVORA you agree to these terms. We have kept them short and readable.",
    seoDescription: "NUVORA terms of use.",
    updatedAt: "2026-09-01",
    sections: [
      { heading: "Our content", paragraphs: [`Everything published on NUVORA is owned by ${site.publisher.legalName} or licensed to it. You may share links freely and quote short excerpts with attribution. Please do not republish full stories without permission.`] },
      { heading: "Information, not advice", paragraphs: ["Our stories are general information. They are not legal, financial, medical or professional advice. Verify anything important with a qualified professional before acting on it."] },
      { heading: "Third-party tools", paragraphs: ["We write about products made by other companies. Their availability, pricing and behaviour can change without notice, and we are not responsible for them."] },
      { paragraphs: ["This document is an editorial placeholder and will be reviewed by legal counsel before launch."] },
    ],
  },
  {
    slug: "affiliate-disclosure",
    title: "Affiliate Disclosure",
    kicker: "How we make money",
    intro: "Some links on NUVORA may earn us a commission. This page explains how that works and why it never changes what we recommend.",
    seoDescription: "How NUVORA handles affiliate links and commissions.",
    updatedAt: "2026-09-01",
    sections: [
      { heading: "What an affiliate link is", paragraphs: ["When you click certain links to a product and go on to buy it, the company may pay NUVORA a small commission. The price you pay is the same."] },
      { heading: "How we handle them", paragraphs: ["Stories that contain affiliate links say so at the end of the piece. Affiliate relationships are managed centrally by our business team and are never visible to the editors deciding what to recommend. Our verdicts are the same whether or not a link earns a commission."] },
      { heading: "What we will never do", paragraphs: ["We will never recommend a product because it pays more, and we will never hide a negative finding because a partner would prefer it."] },
    ],
  },
];

export function getStaticPage(slug: string): StaticPage | undefined {
  return staticPages.find((p) => p.slug === slug);
}
