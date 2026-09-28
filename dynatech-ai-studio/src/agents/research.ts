import { askOrFallback, type Agent } from "../core/agent";
import { ResearchSchema } from "../core/schemas";
import type { ResearchReport } from "../core/types";
import { cityOf, matchIndustry } from "../knowledge";

export const researchAgent: Agent<ResearchReport> = {
  id: "research",
  label: "Research",
  async run(ctx) {
    const { input } = ctx;
    const profile = matchIndustry(`${input.business} ${input.notes ?? ""}`);
    const city = cityOf(input.location);
    const fallback = (): ResearchReport => ({
      industry: profile.label,
      industryKey: profile.key,
      targetAudience: `${input.targetAudience} in ${input.location}`,
      customerProblems: profile.customerProblems,
      services: profile.services.map((s) => s.title),
      positioning: profile.positioning,
      websitePatterns: profile.websitePatterns,
      recommendations: [
        ...profile.recommendations,
        ...(input.goal ? [`Every section should support the stated goal: ${input.goal}`] : []),
        `Reflect ${city} specifics (climate, neighborhoods, local expectations) in copy and imagery.`,
      ],
    });
    const out = await askOrFallback(ctx, {
      task: "research",
      system: "You are the Research Agent. Analyze the business category, audience, problems, services, competitive positioning and modern website patterns. Use industryKey as a short kebab-case slug.",
      prompt: `Business: ${input.business}\nLocation: ${input.location}\nAudience: ${input.targetAudience}\nStyle: ${input.style}\nGoal: ${input.goal ?? "generate leads"}\nNotes: ${input.notes ?? "-"}`,
      schema: ResearchSchema,
      fallback,
    });
    ctx.memory.recordDecision({ agent: "research", key: "industry", value: out.industryKey, rationale: out.industry });
    ctx.report({ summary: `${out.industry}: ${out.customerProblems.length} customer problems, ${out.services.length} services` });
    return out;
  },
};
