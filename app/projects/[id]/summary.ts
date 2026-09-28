/** Human-readable "what did this agent produce" lines, derived from stored project memory. */
type Sections = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function summarize(stageId: string, s: Sections): string[] {
  const out: string[] = [];
  switch (stageId) {
    case "research": {
      const r = s.research; if (!r) break;
      out.push(`Industry: ${r.industry}`, `Audience: ${r.targetAudience}`);
      out.push(`Customer problems (${r.customerProblems.length}): ${r.customerProblems.slice(0, 3).join("; ")}…`);
      out.push(`Services: ${r.services.join(", ")}`, `Positioning: ${r.positioning.join("; ")}`);
      break;
    }
    case "strategy": {
      const r = s.strategy; if (!r) break;
      out.push(`Main message: ${r.mainMessage}`, `Primary CTA: ${r.primaryCTA.label} → ${r.primaryCTA.target}`);
      out.push(`Sections (${r.sections.length}): ${r.sections.map((x: any) => x.component).join(" → ")}`);
      out.push(`Journey: ${r.customerJourney.join(" → ")}`);
      break;
    }
    case "brand": {
      const r = s.brand; if (!r) break;
      out.push(r.provided ? `Extracted ${r.colors.length} colors from the logo; personality: ${r.personality.join(", ")}` : "No logo provided; identity is defined by the Creative Director");
      break;
    }
    case "creative": {
      const r = s.creative; if (!r) break;
      out.push(`Direction: ${r.direction}`, `Concept: ${r.concept}`);
      out.push(`Palette "${r.palette.name}": ground ${r.palette.ground}, ink ${r.palette.ink}, accent ${r.palette.accent}`);
      out.push(`Type: ${r.typography.display} / ${r.typography.body}`, `Hero: ${r.heroConcept}`);
      break;
    }
    case "ux": {
      const r = s.ux; if (!r) break;
      out.push(`Used: ${r.decisions.filter((d: any) => d.used).map((d: any) => d.technique).join(", ")}`);
      out.push(`Rejected: ${r.decisions.filter((d: any) => !d.used).map((d: any) => d.technique).join(", ") || "none"}`);
      if (r.story) out.push(`Scroll story (${r.story.stages.length} stages): ${r.story.stages.map((x: any) => x.label).join(" → ")}`);
      break;
    }
    case "copy": {
      const r = s.copy; if (!r) break;
      out.push(`Brand name: ${r.brandName}${r.brandNameIsPlaceholder ? " (placeholder)" : ""}`, `Hero: "${r.hero.headline}"`, `Sub: ${r.hero.sub}`);
      out.push(`SEO title: ${r.seo.title}`, `Placeholders to fill: ${r.placeholders.length}`);
      break;
    }
    case "media": {
      const r = s.media; if (!r) break;
      const by = (src: string) => r.assets.filter((a: any) => a.source === src).length;
      out.push(`Provider: ${r.provider}`, `${by("pexels")} Pexels assets · ${by("placeholder")} placeholders · ${by("higgsfield")} generated · ${r.assets.filter((a: any) => a.status === "failed").length} failed`);
      for (const e of r.errors ?? []) out.push(`FAILED ${e.slot}: ${e.message}`);
      const plan = s["media-plan"]; if (plan) out.push(`Search plan (${plan.slots.length} slots), e.g. "${plan.slots[0]?.query}"`);
      break;
    }
    case "design-system": {
      const r = s["design-system"]; if (!r) break;
      out.push(`${Object.keys(r.colors).length} color tokens, ${Object.keys(r.typography.scale).length} type steps, ${Object.keys(r.spacing).length} spacing steps`);
      break;
    }
    case "video": {
      const r = s.video; if (!r) break;
      out.push(`Decision: ${r.decision}`, r.reasoning, `Phase: ${r.phase}${r.phaseDetail ? ` — ${r.phaseDetail}` : ""}`); if (r.prompt) out.push(`Prompt: ${r.prompt}`);
      if (r.job) out.push(`Generation job ${r.job.id}: ${r.job.status}`);
      if (r.qa) for (const c of r.qa.checks) out.push(`Video QA — ${c.passed ? "PASS" : "FAIL"}: ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
      break;
    }
    case "architect": {
      const r = s.architecture; if (!r) break;
      out.push(`${r.framework}`, `Routes: ${r.routes.join(", ")}`, ...r.developerFlags.map((f: string) => `Developer flag: ${f}`));
      break;
    }
    case "developer": {
      const r = s.code; if (!r) break;
      out.push(`${r.files.length} files written to ${r.outputDir}`, `Install: ${r.installCommand}  ·  Run: ${r.runCommand}`);
      break;
    }
    case "qa": {
      const r = s.qa; if (!r) break;
      out.push(`Verdict ${r.verdict} · score ${r.score}/100 · ${r.checks.filter((c: any) => c.passed).length}/${r.checks.length} checks passed${r.browserQa ? " (includes real-browser checks)" : ""}`);
      for (const b of r.blockers ?? []) out.push(`BLOCKER: ${b}`);
      for (const w of r.warnings ?? []) out.push(`Warning: ${w}`);
      if (r.review) out.push(`Reviewer (${r.review.provider} / ${r.review.model}): ${r.review.summary}`);
      for (const c of r.checks.filter((c: any) => !c.passed)) out.push(`Failed: ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
      break;
    }
  }
  return out;
}
