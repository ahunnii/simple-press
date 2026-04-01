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

export type HappyBambooServicesItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const defaultServices = (): HappyBambooServicesItem[] => [
  {
    icon: Heart,
    title: "Premium 3-Ply Toilet Tissue",
    description:
      "Crafted from the softest bamboo fibers. Each roll contains 300 sheets of luxurious softness, ensuring a gentle touch for you and your family.",
  },
  {
    icon: Recycle,
    title: "100% Biodegradable",
    description:
      "Every sheet of Happy Bamboo toilet tissue is made from 100% biodegradable materials, helping to reduce deforestation and promote a greener future.",
  },
  {
    icon: Shield,
    title: "Chemical & Hypoallergenic Free",
    description:
      "Our products are free from harmful chemicals, making them safe for sensitive skin and better for your health.",
  },
  {
    icon: Leaf,
    title: "Eco-Friendly Packaging",
    description:
      "Sustainable packaging that minimizes environmental impact while keeping your products fresh and protected.",
  },
];

export function parseHappyBambooServicesList(
  raw: unknown,
): HappyBambooServicesItem[] {
  if (!Array.isArray(raw)) return defaultServices();

  const out: HappyBambooServicesItem[] = [];
  for (const row of raw) {
    const parsed = bambooRowSchema.safeParse(row);
    if (!parsed.success) continue;
    const { icon, title, description } = parsed.data;
    const Icon = getLucideTemplateIcon(icon) ?? Leaf;
    out.push({ icon: Icon, title, description });
  }

  return out.length > 0 ? out : defaultServices();
}
