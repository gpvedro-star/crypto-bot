import type { DesignSystem } from "../../../core/types";

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** design-system.json → tokens.css. The single place raw values are allowed to exist in the generated site. */
export function renderTokensCss(ds: DesignSystem): string {
  const lines: string[] = [];
  const add = (name: string, value: string) => lines.push(`  --${name}: ${value};`);
  for (const [k, v] of Object.entries(ds.colors)) add(k, v);
  add("font-display", ds.typography.fontDisplay);
  add("font-body", ds.typography.fontBody);
  add("display-weight", String(ds.typography.displayWeight));
  add("display-tracking", ds.typography.displayTracking);
  add("display-leading", ds.typography.displayLeading);
  for (const [k, v] of Object.entries(ds.typography.scale)) add(k, v);
  for (const [k, v] of Object.entries(ds.spacing)) add(`space-${k}`, v);
  for (const [k, v] of Object.entries(ds.radius)) add(`radius-${k}`, v);
  for (const [k, v] of Object.entries(ds.shadows)) add(`shadow-${k}`, v);
  add("max-width", ds.layout.maxWidth);
  add("gutter", ds.layout.gutter);
  add("section-padding", ds.layout.sectionPadding);
  for (const [comp, props] of Object.entries(ds.components)) for (const [k, v] of Object.entries(props)) add(`${comp}-${kebab(k)}`, v);
  for (const [k, v] of Object.entries(ds.animations.durations)) add(`dur-${k}`, v);
  for (const [k, v] of Object.entries(ds.animations.easings)) add(`ease-${k}`, v);
  add("reveal-distance", ds.animations.revealDistance);
  add("story-length", ds.animations.storyScrollLength);
  for (const [k, v] of Object.entries(ds.breakpoints)) add(`bp-${k}`, v);
  return `/* GENERATED from design-system.json by DynaTech AI Studio. Edit the design system, not this file. */\n:root {\n${lines.join("\n")}\n}\n`;
}
