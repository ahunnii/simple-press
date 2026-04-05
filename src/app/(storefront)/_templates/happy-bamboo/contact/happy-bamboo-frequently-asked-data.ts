import { z } from "zod";

const bambooRowSchema = z
  .object({
    question: z.string(),
    answer: z.string(),
  })
  .passthrough();

export type HappyBambooFrequentlyAskedItem = {
  question: string;
  answer: string;
};

const defaultFrequentlyAsked = (): HappyBambooFrequentlyAskedItem[] => [
  {
    question: "What is Happy Bamboo toilet tissue made from?",
    answer:
      "Our toilet tissue is made from 100% bamboo pulp, a renewable and eco-friendly alternative to traditional tree-based paper.",
  },
  {
    question: "Is your product really chemical-free?",
    answer:
      "Yes, Happy Bamboo is free from harsh chemicals, dyes, and added fragrances, making it safe for everyday use.",
  },
  {
    question: "Is it safe for sensitive skin?",
    answer:
      "Absolutely. Our toilet tissue is designed to be gentle, soft, and suitable for sensitive skin.",
  },
  {
    question: "Is Happy Bamboo septic-safe?",
    answer:
      "Yes, our product is septic-safe and biodegradable, designed to break down efficiently.",
  },
  {
    question:
      "How soft is bamboo toilet tissue compared to regular toilet paper?",
    answer:
      "Happy Bamboo offers a premium 3-ply design, providing both softness and durability comparable to traditional brands.",
  },
  {
    question: "Where can I purchase Happy Bamboo products?",
    answer:
      "Our products are available through online orders and select distribution partners, with retail expansion underway.",
  },
  {
    question: "Are you registered for government contracts?",
    answer:
      "Yes, Zaires Visions LLC is SAM.gov registered and eligible for government contracting opportunities.",
  },
  {
    question: "How does your company support the community?",
    answer:
      "We are committed to job creation, supporting underserved communities, and promoting health awareness initiatives.",
  },
];

export function parseHappyBambooFrequentlyAskedList(
  raw: unknown,
): HappyBambooFrequentlyAskedItem[] {
  if (!Array.isArray(raw)) return defaultFrequentlyAsked();

  const out: HappyBambooFrequentlyAskedItem[] = [];
  for (const row of raw) {
    const parsed = bambooRowSchema.safeParse(row);
    if (!parsed.success) continue;
    const { question, answer } = parsed.data;
    out.push({ question, answer });
  }

  return out.length > 0 ? out : defaultFrequentlyAsked();
}
