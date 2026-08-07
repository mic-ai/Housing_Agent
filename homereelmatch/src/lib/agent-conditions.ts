import { z } from "zod";

export const AgentConditionsSchema = z.object({
  budgetRangeTag: z.string().nullable().optional(),
  areaPreference: z.string().nullable().optional(),
  familyComposition: z.string().nullable().optional(),
  timing: z.string().nullable().optional(),
  constructionMethodTag: z.string().nullable().optional(),
  priorityFactors: z.array(z.string()).max(10).default([]),
  desiredTags: z.array(z.string()).max(10).default([]),
});

export type AgentConditions = z.infer<typeof AgentConditionsSchema>;

export const EMPTY_AGENT_CONDITIONS: AgentConditions = {
  priorityFactors: [],
  desiredTags: [],
};
