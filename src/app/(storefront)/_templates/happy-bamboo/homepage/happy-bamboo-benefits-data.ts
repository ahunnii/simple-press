import type { LucideIcon } from "lucide-react";
import {
  Droplets,
  Feather,
  Heart,
  Leaf,
  Recycle,
  Shield,
  TreePine,
  Wind,
} from "lucide-react";
import { z } from "zod";

import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";

export const HAPPY_BAMBOO_BENEFITS_LIST_KEY =
  "happy-bamboo.homepage.benefits-list";

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
  {
    icon: TreePine,
    title: "Sustainability",
    description:
      "Bamboo is one of the fastest-growing plants in the world, capable of reaching maturity in just 3-5 years. It can be harvested without killing the plant, allowing it to regenerate quickly.",
  },
  {
    icon: Recycle,
    title: "Biodegradable",
    description:
      "Bamboo products are biodegradable, meaning they break down naturally and do not contribute to landfill waste, unlike many plastic products.",
  },
  {
    icon: Wind,
    title: "Carbon Sequestration",
    description:
      "Bamboo absorbs more carbon dioxide and releases more oxygen than many trees, contributing positively to the environment and helping to combat climate change.",
  },
  {
    icon: Shield,
    title: "Natural Antimicrobial",
    description:
      "Bamboo has natural antimicrobial properties, which can help reduce bacteria and odors, making it a hygienic choice for bathroom and personal items.",
  },
  {
    icon: Droplets,
    title: "Eco-Friendly",
    description:
      "Bamboo requires less water and no pesticides or fertilizers to grow compared to traditional crops, reducing the ecological footprint associated with its cultivation.",
  },
  {
    icon: Feather,
    title: "Lightweight",
    description:
      "Bamboo products are typically lightweight, making them easy to handle and transport, which is especially beneficial for personal items and home products.",
  },
  {
    icon: Leaf,
    title: "Versatility",
    description:
      "Bamboo can be used to create a wide range of products, including furniture, kitchenware, flooring, and paper. This versatility allows consumers to find bamboo options for many needs.",
  },
  {
    icon: Heart,
    title: "Support Local Economies",
    description:
      "Many bamboo products are sourced from local artisans and communities, supporting local economies and promoting fair trade practices.",
  },
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
