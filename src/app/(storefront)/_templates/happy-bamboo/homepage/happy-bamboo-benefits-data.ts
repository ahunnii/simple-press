import type { LucideIcon } from "lucide-react";
import { Leaf } from "lucide-react";
import { z } from "zod";

import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";

import { DEFAULT_HAPPY_BAMBOO_BENEFITS_LIST } from "../index";

const benefitRowSchema = z
  .object({
    icon: z.string(),
    title: z.string(),
    description: z.string(),
  })
  .passthrough();

export type HappyBambooBenefitItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const defaultBenefits = (): HappyBambooBenefitItem[] => [
  ...DEFAULT_HAPPY_BAMBOO_BENEFITS_LIST,
];

export function parseHappyBambooBenefitsList(
  raw: unknown,
): HappyBambooBenefitItem[] {
  if (!Array.isArray(raw)) return defaultBenefits();

  const out: HappyBambooBenefitItem[] = [];
  for (const row of raw) {
    const parsed = benefitRowSchema.safeParse(row);
    if (!parsed.success) continue;
    const { icon, title, description } = parsed.data;
    const Icon = getLucideTemplateIcon(icon) ?? Leaf;
    out.push({ icon: Icon, title, description });
  }

  return out.length > 0 ? out : defaultBenefits();
}
