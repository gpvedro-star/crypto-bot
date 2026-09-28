/**
 * Shared data structures for DynaTech AI Studio.
 * Every agent reads/writes one of the `ProjectMemory` sections defined here.
 */

// ───────────────────────── Input ─────────────────────────

export interface BusinessInput {
  business: string; // "Luxury Landscaping Company"
  location: string; // "Miami, Florida"
  targetAudience: string;
  style: string; // "Premium, cinematic, sophisticated"
  goal?: string;
  notes?: string;
  /** Optional real business name. When absent a descriptive working title is used and flagged as a placeholder. */
  businessName?: string;
  /** Optional path to a logo file (png/jpg) for the Brand Agent. */
  logoPath?: string;
  /** Optional real contact details. Anything missing stays a placeholder — never invented. */
  contact?: { phone?: string; email?: string; address?: string };
}

export type RunMode = "autonomous" | "supervised";
export type Checkpoint = "strategy" | "creative" | "homepage" | "final";

// ───────────────────────── Agent outputs ─────────────────────────

export interface ResearchReport {
  industry: string;
  industryKey: string;
  targetAudience: string;
  customerProblems: string[];
  services: string[];
  positioning: string[];
  websitePatterns: string[];
  recommendations: string[];
}

export interface SectionPlan {
  id: string;
  component: ComponentName;
  purpose: string; // every section must have a reason to exist
  layout: string; // e.g. "full-bleed", "split-left", "grid-3"
  tone: "dark" | "light" | "accent";
}

export interface StrategyBlueprint {
  mainMessage: string;
  primaryCTA: { label: string; target: string };
  secondaryCTA: { label: string; target: string };
  conversionStrategy: string[];
  customerJourney: string[];
  trustStrategy: string[];
  contentHierarchy: string[];
  pages: { path: string; purpose: string }[];
  sections: SectionPlan[];
}

export interface CreativeDirection {
  concept: string;
  direction: "premium-editorial" | "cinematic-dark" | "warm-minimal" | "bold-graphic" | "clean-modern";
  visualLanguage: string[];
  photographyStyle: string;
  animationStyle: string;
  layoutPersonality: string;
  heroConcept: string;
  sectionTransitions: string;
  palette: { name: string; mode: "dark" | "light"; ground: string; surface: string; ink: string; accent: string; muted: string };
  typography: { display: string; body: string; displayWeight: number; tracking: string; rationale: string };
  avoid: string[];
}

export type MotionKind =
  | "scroll-story"
  | "parallax"
  | "before-after"
  | "interactive-gallery"
  | "cinematic-video"
  | "micro-interactions"
  | "sticky-sections"
  | "progressive-reveal"
  | "interactive-cards";

export interface ExperiencePlan {
  decisions: { technique: MotionKind; used: boolean; purpose: string }[];
  story: { title: string; stages: { label: string; caption: string; art: string }[] } | null;
  homepageFlow: SectionPlan[]; // final ordering + layout variation
  mobileRules: string[];
  reducedMotion: string;
}

export interface FaqItem { q: string; a: string }
export interface PlaceholderNote { field: string; note: string }

export interface SiteCopy {
  brandName: string;
  brandNameIsPlaceholder: boolean;
  hero: { eyebrow: string; headline: string; sub: string; primaryCta: string; secondaryCta: string };
  intro: { eyebrow: string; headline: string; body: string[] };
  services: { eyebrow: string; headline: string; intro: string; items: { title: string; body: string; detail: string }[] };
  story: { eyebrow: string; headline: string; intro: string; stages: { label: string; caption: string }[] };
  gallery: { eyebrow: string; headline: string; intro: string; captions: string[] };
  beforeAfter: { eyebrow: string; headline: string; body: string; beforeLabel: string; afterLabel: string };
  process: { eyebrow: string; headline: string; intro: string; steps: { title: string; body: string }[] };
  trust: { eyebrow: string; headline: string; intro: string; checklist: { title: string; body: string }[]; proofSlots: { label: string; hint: string }[] };
  testimonials: { eyebrow: string; headline: string; slots: { hint: string }[] };
  faq: { eyebrow: string; headline: string; items: FaqItem[] };
  cta: { headline: string; body: string; button: string };
  contact: { eyebrow: string; headline: string; body: string; fields: { name: string; label: string; type: string; required: boolean; options?: string[] }[]; submitLabel: string; privacyNote: string };
  footer: { tagline: string; note: string };
  marquee: string[];
  seo: { title: string; description: string; keywords: string[]; ogTitle: string; ogDescription: string; localBusinessType: string };
  placeholders: PlaceholderNote[];
}

export interface BrandProfile {
  provided: boolean;
  colors: { hex: string; share: number; role: string }[];
  personality: string[];
  tone: string;
  shapes: string[];
  typographyCharacter: string;
  notes: string[];
  logoUrl?: string;
}

// ───────────────────────── Design system ─────────────────────────

export interface DesignSystem {
  colors: Record<string, string>;
  typography: {
    fontDisplay: string; fontBody: string; googleFontsHref: string;
    displayWeight: number; displayTracking: string; displayLeading: string;
    scale: Record<string, string>;
  };
  spacing: Record<string, string>;
  radius: Record<string, string>;
  shadows: Record<string, string>;
  layout: { maxWidth: string; gutter: string; sectionPadding: string };
  components: Record<string, Record<string, string>>;
  animations: { durations: Record<string, string>; easings: Record<string, string>; revealDistance: string; storyScrollLength: string };
  breakpoints: Record<string, string>;
}

// ───────────────────────── Assets ─────────────────────────

export type AssetStatus = "approved" | "candidate" | "placeholder" | "rejected" | "pending" | "failed";
export type AssetUsage =
  | "hero" | "hero-video" | "story" | "gallery" | "split" | "before" | "after" | "contact" | "logo" | "about";

export interface Asset {
  id: string;
  type: "image" | "video";
  source: "pexels" | "higgsfield" | "placeholder" | "brand-upload";
  url: string;
  posterUrl?: string;
  width?: number;
  height?: number;
  usage: AssetUsage;
  slot: string; // e.g. "story-3", "gallery-2"
  description: string;
  alt: string;
  query?: string;
  credit?: { name: string; url: string };
  score?: number;
  status: AssetStatus;
  /** Present for generated assets */
  prompt?: string;
  requestId?: string;
}

export interface MediaSlot {
  slot: string;
  usage: AssetUsage;
  type: "image" | "video";
  orientation: "landscape" | "portrait" | "square";
  minWidth: number;
  brief: string; // what the picture must show
  query: string; // final search query
  alt: string;
}

export interface MediaPlan { slots: MediaSlot[]; searchSuffix: string; rules: string[] }
export interface MediaResult { assets: Asset[]; provider: string; usedPlaceholders: boolean; log: string[] }

export interface VideoPlan {
  decision: "stock" | "generate" | "none";
  reasoning: string;
  concept: string;
  prompt: string;
  durationSeconds: number;
  aspect: "16:9" | "9:16";
  job?: GenerationJob;
  asset?: Asset;
}

export interface GenerationJob {
  id: string;
  provider: string;
  status: "queued" | "running" | "completed" | "failed" | "disabled";
  prompt: string;
  url?: string;
  posterUrl?: string;
  error?: string;
}

// ───────────────────────── Architecture / code ─────────────────────────

export interface ArchitecturePlan {
  engine: string;
  framework: string;
  rendering: string;
  routes: string[];
  components: string[];
  dataFlow: string;
  performanceBudget: { lcpMs: number; jsKb: number; imageStrategy: string };
  accessibility: string[];
  seo: string[];
  developerFlags: string[]; // problems the developer spotted with the design
}

export interface CodeManifest {
  engine: string;
  outputDir: string;
  files: string[];
  builtAt: string;
  iteration: number;
  installCommand: string;
  runCommand: string;
}

// ───────────────────────── QA ─────────────────────────

export interface QAIssue {
  id: string;
  category: "design" | "ux" | "mobile" | "technical" | "ai-quality" | "content";
  severity: "critical" | "major" | "minor";
  message: string;
  /** Which agent should fix it and how. Absent = needs a human. */
  fix?: { agent: "copy" | "creative" | "ux" | "media" | "developer"; action: string; target?: string };
}

export interface QAReport {
  score: number;
  criticalIssues: QAIssue[];
  designIssues: QAIssue[];
  uxIssues: QAIssue[];
  technicalIssues: QAIssue[];
  recommendedChanges: string[];
  checks: { name: string; passed: boolean; detail?: string }[];
  iteration: number;
  browserQa: boolean;
}

export interface FinalReport {
  status: "approved" | "needs_human_approval";
  score: number;
  iterations: number;
  outputDir: string;
  openItems: string[];
  placeholdersToFill: PlaceholderNote[];
  summary: string;
}

// ───────────────────────── Component system ─────────────────────────

export const COMPONENT_NAMES = [
  "Navbar", "Hero", "VideoHero", "Marquee", "SplitSection", "Services", "InteractiveCards",
  "ScrollStory", "BeforeAfter", "ImageGallery", "Process", "Stats", "Trust", "Testimonials",
  "FAQ", "CTA", "Contact", "Footer", "ImageReveal", "VideoReveal",
] as const;
export type ComponentName = (typeof COMPONENT_NAMES)[number];

// ───────────────────────── Project memory ─────────────────────────

export interface ProjectMemory {
  business: BusinessInput;
  research: ResearchReport;
  strategy: StrategyBlueprint;
  brand: BrandProfile;
  creative: CreativeDirection;
  ux: ExperiencePlan;
  "design-system": DesignSystem;
  copy: SiteCopy;
  media: MediaResult;
  "media-plan": MediaPlan;
  video: VideoPlan;
  architecture: ArchitecturePlan;
  code: CodeManifest;
  qa: QAReport;
  final: FinalReport;
}
export type MemorySection = keyof ProjectMemory;
export const MEMORY_SECTIONS: MemorySection[] = [
  "business", "research", "strategy", "brand", "creative", "ux", "design-system", "copy",
  "media-plan", "media", "video", "architecture", "code", "qa", "final",
];

/** A decision an agent recorded; later agents may not contradict it without an explicit override note. */
export interface Decision {
  agent: AgentId;
  key: string;
  value: string;
  rationale: string;
  at: string;
  overrides?: { previous: string; because: string };
}

export type AgentId =
  | "research" | "strategy" | "brand" | "creative" | "ux" | "copy" | "media" | "video"
  | "design-system" | "architect" | "developer" | "qa";

export type StageStatus = "pending" | "running" | "done" | "failed" | "awaiting_approval" | "skipped";

export interface StageState {
  id: AgentId;
  label: string;
  status: StageStatus;
  startedAt?: string;
  finishedAt?: string;
  summary?: string;
  usedLLM?: string; // provider name or "knowledge-base"
  error?: string;
}

export interface ProjectState {
  id: string;
  name: string;
  mode: RunMode;
  status: "created" | "running" | "awaiting_approval" | "completed" | "needs_human_approval" | "failed";
  awaiting?: Checkpoint;
  approvals: Checkpoint[];
  feedback?: Partial<Record<Checkpoint, string>>;
  createdAt: string;
  updatedAt: string;
  stages: StageState[];
  iteration: number;
}

export interface StudioEvent { at: string; level: "info" | "warn" | "error"; agent?: AgentId | "orchestrator"; message: string }
