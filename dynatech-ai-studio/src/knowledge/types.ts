export interface IndustryProfile {
  key: string;
  label: string;
  matches: RegExp;
  /** Plain noun phrase for what the customer buys: "outdoor spaces" */
  offering: string;
  /** singular person noun: "homeowner" */
  customer: string;
  customerProblems: string[];
  services: { title: string; body: string; detail: string }[];
  positioning: string[];
  websitePatterns: string[];
  recommendations: string[];
  primaryCta: string;
  secondaryCta: string;
  heroHeadlines: string[];
  heroSub: string;
  introHeadline: string;
  introBody: string[];
  /** true when the service is a visible before→after change (enables story + before/after) */
  transformation: boolean;
  storyTitle: string;
  storyIntro: string;
  stages: { label: string; caption: string }[];
  beforeAfter: { headline: string; body: string; before: string; after: string };
  process: { headline: string; intro: string; steps: { title: string; body: string }[] };
  trust: { headline: string; intro: string; checklist: { title: string; body: string }[]; proofSlots: { label: string; hint: string }[] };
  faq: { q: string; a: string }[];
  marquee: string[];
  formOptions: { label: string; options: string[] };
  schemaType: string;
  galleryCaptions: string[];
  media: {
    hero: string; video: string; story: string[]; gallery: string[]; split: string; contact: string; beforeAfter: [string, string];
    subject: string; // what pictures must show
  };
}
