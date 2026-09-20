import { contactEmail, site } from "./site";

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
 * Trust and legal pages.
 *
 * Ground rule: nothing here asserts a fact about NUVORA that is not actually
 * true of this deployment. No legal entity, registered address, staff history,
 * commercial partnership or editorial process that does not exist. Where a
 * process is still being built, the page says so plainly rather than claiming
 * a safeguard that is not in place.
 *
 * These pages describe how the site behaves; they are not legal advice and
 * should be reviewed by counsel before NUVORA takes on real users at scale.
 * That review note belongs in the repository, not in front of readers.
 */

/**
 * Contact sections. A real address is shown only when one is configured;
 * otherwise the page says plainly that there is not one yet rather than
 * printing a mailbox nobody reads.
 */
const contactSection = (heading: string, lead: string, pending: string): StaticPageSection[] => [
  { heading, paragraphs: [contactEmail ? `${lead} ${contactEmail}` : pending] },
];

export const staticPages: StaticPage[] = [
  {
    slug: "about",
    title: "About NUVORA",
    kicker: "Who we are",
    intro:
      "NUVORA is an American digital magazine that explains artificial intelligence to normal people — clearly, calmly and practically.",
    seoDescription:
      "NUVORA is an American digital magazine that explains artificial intelligence clearly, calmly and practically for normal people.",
    updatedAt: "2026-09-01",
    sections: [
      {
        heading: "Why we exist",
        paragraphs: [
          "Artificial intelligence is becoming part of everyday life — in email, in phones, in the office and at the kitchen table. Most coverage is written either for engineers or for investors. Almost none is written for the intelligent, curious adult who simply wants to understand what is happening and what to do about it.",
          "NUVORA is written for that person. Our readers are smart. They are not necessarily technical. They do not need to be.",
        ],
      },
      {
        heading: "What we believe",
        paragraphs: [
          "Any technology worth using can be explained at a kitchen table. Trust is earned with clarity, not with confidence. And the most valuable thing we can give a reader is the feeling of finally understanding something.",
        ],
        bullets: [
          "We explain, we do not hype.",
          "We say when we do not know.",
          "We correct our mistakes in public.",
          "We are open about how the magazine is made.",
        ],
      },
      {
        heading: "How NUVORA is made",
        paragraphs: [
          "NUVORA is a new publication and is being built in the open. It is produced with an AI-assisted editorial workflow: AI systems help with research, drafting, editing and production, within a process designed to verify factual claims before publication.",
          "We would rather tell you that plainly than imply a newsroom we do not yet have. Our AI usage policy sets out exactly which parts of the process are automated and which are not.",
        ],
      },
    ],
  },
  {
    slug: "editorial-standards",
    title: "Editorial Standards",
    kicker: "How we work",
    intro: "The standards NUVORA holds itself to, and an honest account of how the magazine is currently produced.",
    seoDescription:
      "NUVORA's editorial standards: accuracy, independence, clarity, corrections, and how our AI-assisted workflow is built.",
    updatedAt: "2026-09-01",
    sections: [
      {
        heading: "Where NUVORA is today",
        paragraphs: [
          "NUVORA is a new publication with an AI-assisted editorial workflow still being built. This page describes the standards that workflow is designed to meet. Where a control is not yet fully in place, we say so rather than implying otherwise.",
        ],
      },
      {
        heading: "Accuracy",
        paragraphs: [
          "Factual claims are intended to be verified against a source before publication, and our workflow is being built around that check. AI systems can produce confident, fluent text that is wrong, so nothing is treated as true simply because it was generated.",
          "Where something cannot be verified, the aim is to say so in the story rather than to imply certainty.",
        ],
      },
      {
        heading: "Independence",
        paragraphs: [
          "No company sees a story before it is published. NUVORA has no advertising or affiliate partnerships in place today; if that changes, qualifying content will carry a clear disclosure and commercial arrangements will not decide what we cover or what we conclude.",
        ],
      },
      {
        heading: "Tools coverage",
        paragraphs: [
          "Tool pages describe what a product is, who it suits and what it costs. Prices and product behaviour change often, and our pages ask you to confirm them on the official site before you pay.",
          "Where NUVORA has not completed hands-on assessment of a tool, no verdict is shown. An empty verdict means the work is not finished — not that the product failed.",
        ],
      },
      {
        heading: "Clarity",
        paragraphs: [
          "We write for an intelligent adult who is not a specialist. Technical terms are explained the first time they appear. If a passage cannot be understood without prior knowledge, it is rewritten.",
        ],
      },
      {
        heading: "Corrections",
        paragraphs: [
          "When we get something wrong, we fix it and note the change. Every story shows both its publication date and the date it was last updated. See our corrections policy.",
        ],
      },
    ],
  },
  {
    slug: "ai-usage-policy",
    title: "AI Usage Policy",
    kicker: "How we use AI ourselves",
    intro:
      "A magazine about AI should be transparent about its own use of it. NUVORA is produced with an AI-assisted workflow, and this page explains what that means.",
    seoDescription: "How NUVORA uses artificial intelligence in its own editorial process, and the limits placed on it.",
    updatedAt: "2026-09-01",
    sections: [
      {
        heading: "What AI is used for",
        paragraphs: [
          "NUVORA uses AI-assisted systems across much of how the magazine is made. We think readers are entitled to know that rather than to assume a conventional newsroom.",
        ],
        bullets: [
          "Research assistance and summarizing source material",
          "Drafting and editing assistance",
          "Supporting the fact-checking workflow",
          "Illustrations, where imagery is used",
          "Search metadata and social versions of published stories",
          "Publishing automation",
        ],
      },
      {
        heading: "The limits we work to",
        paragraphs: [
          "AI output can be wrong, and it can be wrong confidently. These are the rules the workflow is built around.",
        ],
        bullets: [
          "Factual claims should be verified before publication, not accepted because a model produced them.",
          "Automated publishing runs through QA controls; new articles enter as drafts rather than going live unchecked.",
          "AI-generated or abstract imagery is illustration. It is never presented as documentary photography of a real event.",
          "Quotes, sources and statistics are not to be generated. If we cannot source it, we do not publish it.",
        ],
      },
      {
        heading: "What we will not claim",
        paragraphs: [
          "We will not describe automated systems as human employees, and we will not claim a level of human review that is not actually performed. As the workflow matures and specific controls are in place, this page will be updated to describe them precisely.",
        ],
      },
      {
        heading: "Disclosure",
        paragraphs: [
          "Because AI assistance is used throughout production, treat it as present across the magazine rather than as an exception flagged on individual stories.",
        ],
      },
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
      {
        heading: "How corrections work",
        paragraphs: [
          "Factual errors are corrected as soon as they are confirmed. Significant corrections are noted at the bottom of the story with the date. Minor fixes to spelling or style are made without a note.",
          "Every story displays both its original publication date and the date it was last updated, so you can always see how fresh it is.",
        ],
      },
      ...contactSection(
        "Report an error",
        "Send the story link and the correction to",
        "NUVORA does not have a published contact address yet. One will be listed here as soon as it is available, so that corrections can be reported directly.",
      ),
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    kicker: "Get in touch",
    intro: "How to reach NUVORA.",
    seoDescription: "Contact NUVORA.",
    updatedAt: "2026-09-01",
    sections: [
      ...contactSection(
        "Editorial",
        "Story ideas, corrections and questions go to",
        "NUVORA does not have a published contact address yet. One will be listed here as soon as it is available.",
      ),
      {
        heading: "Commercial enquiries",
        paragraphs: [
          "NUVORA does not currently run advertising or affiliate partnerships. If that changes, details for commercial enquiries will be published here.",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    kicker: "Your data",
    intro:
      "This policy describes what this website actually does with your information today. It is written in plain English on purpose, and it will be updated as the site adds functionality.",
    seoDescription: "NUVORA privacy policy: what this site collects, what it does not, and the choices you have.",
    updatedAt: "2026-09-01",
    sections: [
      {
        heading: "What this site collects",
        paragraphs: [
          "Browsing NUVORA does not require an account and we do not ask you for personal information to read a story.",
          "If you submit the newsletter form, your email address is sent to NUVORA so it can be added to the mailing list. Until the mailing list provider is connected, the form tells you that signup is unavailable and no address is stored.",
        ],
      },
      {
        heading: "Cookies and analytics",
        paragraphs: [
          "This site sets no cookies of its own and runs no analytics or advertising trackers. Nothing here follows you across other websites.",
          "Pages are served over the internet, so routine technical information such as your IP address is processed by our hosting provider in order to deliver the site, as it is for any website you visit.",
        ],
      },
      {
        heading: "What we do not do",
        paragraphs: [
          "We do not sell personal information. We do not share your email address with advertisers, and NUVORA has no advertising partners today. If advertising or analytics are introduced, this page will be updated before they go live.",
        ],
      },
      {
        heading: "Your choices",
        paragraphs: [
          contactEmail
            ? `Newsletter emails include a one-click unsubscribe link. You can ask us to delete information you have given us by writing to ${contactEmail}.`
            : "Newsletter emails will include a one-click unsubscribe link. A contact address for data requests will be published here once one is available.",
        ],
      },
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
      {
        heading: "Our content",
        paragraphs: [
          `Everything published on ${site.name} is owned by NUVORA or licensed to it. You may share links freely and quote short excerpts with attribution. Please do not republish full stories without permission.`,
        ],
      },
      {
        heading: "How NUVORA is produced",
        paragraphs: [
          "NUVORA is produced with an AI-assisted editorial workflow. AI can make mistakes, and while our process is designed to catch them before publication, we cannot guarantee that every article is free of error. Our AI usage policy explains the approach and our corrections policy explains how to report a problem.",
        ],
      },
      {
        heading: "Information, not advice",
        paragraphs: [
          "Our stories are general information. They are not legal, financial, medical or professional advice. Verify anything important with a qualified professional before acting on it.",
        ],
      },
      {
        heading: "Third-party tools",
        paragraphs: [
          "We write about products made by other companies. Their availability, pricing and behaviour can change without notice, and we are not responsible for them. Always confirm current pricing and terms with the provider.",
        ],
      },
    ],
  },
  {
    slug: "affiliate-disclosure",
    title: "Affiliate Disclosure",
    kicker: "How NUVORA is funded",
    intro: "NUVORA has no affiliate partnerships today. This page explains what would change if that ever happens.",
    seoDescription: "How NUVORA would handle affiliate links and commissions.",
    updatedAt: "2026-09-01",
    sections: [
      {
        heading: "Where things stand",
        paragraphs: [
          "NUVORA currently earns no commission from any link on this site. Links to tools go to the provider's own website and carry no affiliate tracking.",
        ],
      },
      {
        heading: "If that changes",
        paragraphs: [
          "NUVORA may introduce affiliate links in future. If it does, any story containing one will say so clearly, and this page will name the arrangement.",
          "An affiliate link means that if you click through and buy something, the provider may pay NUVORA a commission. The price you pay is unaffected.",
        ],
      },
      {
        heading: "What we will never do",
        paragraphs: [
          "We will never recommend a product because it pays more, and we will never withhold a negative finding because a commercial partner would prefer it.",
        ],
      },
    ],
  },
];

export function getStaticPage(slug: string): StaticPage | undefined {
  return staticPages.find((p) => p.slug === slug);
}
