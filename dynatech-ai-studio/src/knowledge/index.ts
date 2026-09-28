import { landscaping } from "./landscaping";
import { dental, generic, lawFirm, restaurant } from "./others";
import type { IndustryProfile } from "./types";

export * from "./types";
const ALL: IndustryProfile[] = [landscaping, restaurant, lawFirm, dental];

export function matchIndustry(businessText: string): IndustryProfile {
  return ALL.find((p) => p.matches.test(businessText)) ?? generic;
}

export function cityOf(location: string): string {
  return location.split(",")[0].trim() || location;
}

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
