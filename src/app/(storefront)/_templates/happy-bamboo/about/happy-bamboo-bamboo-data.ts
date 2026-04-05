import type { LucideIcon } from "lucide-react";
import {
  Droplets,
  Feather,
  Heart,
  Leaf,
  Recycle,
  Shield,
  TreeDeciduous,
  TreePine,
  Wind,
} from "lucide-react";
import { z } from "zod";

import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";

const bambooRowSchema = z
  .object({
    icon: z.string(),
    title: z.string(),
    description: z.string(),
  })
  .passthrough();

export type HappyBambooBambooItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const defaultBamboo = (): HappyBambooBambooItem[] => [
  {
    icon: TreeDeciduous,
    title: "Saves Trees & Wildlife",
    description:
      "Bamboo grows up to 3 feet per day and regenerates without replanting, protecting forests and wildlife habitats.",
  },
  {
    icon: Droplets,
    title: "Uses Less Water",
    description:
      "Bamboo requires significantly less water than traditional tree farming, conserving precious water resources.",
  },
  {
    icon: Recycle,
    title: "Naturally Renewable",
    description:
      "As one of the fastest-growing plants on Earth, bamboo is a truly sustainable and renewable resource.",
  },
  {
    icon: Shield,
    title: "Naturally Antibacterial",
    description:
      "Bamboo has natural antibacterial properties, making it hygienic and safe for personal care products.",
  },
  {
    icon: Leaf,
    title: "Carbon Absorption",
    description:
      "Bamboo absorbs more CO2 and releases more oxygen than equivalent stands of trees, fighting climate change.",
  },
  {
    icon: Heart,
    title: "Soft & Strong",
    description:
      "Bamboo fibers create a product that is both incredibly soft and durable, providing superior comfort.",
  },
];

export function parseHappyBambooBambooList(
  raw: unknown,
): HappyBambooBambooItem[] {
  if (!Array.isArray(raw)) return defaultBamboo();

  const out: HappyBambooBambooItem[] = [];
  for (const row of raw) {
    const parsed = bambooRowSchema.safeParse(row);
    if (!parsed.success) continue;
    const { icon, title, description } = parsed.data;
    const Icon = getLucideTemplateIcon(icon) ?? Leaf;
    out.push({ icon: Icon, title, description });
  }

  return out.length > 0 ? out : defaultBamboo();
}
