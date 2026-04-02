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
    question: "How long does shipping take?",
    answer:
      "Standard shipping takes 3-5 business days. Express shipping is available for 1-2 business day delivery. Free standard shipping is available on all orders over $35.",
  },
  {
    question: "Is Happy Bamboo septic safe?",
    answer:
      "Yes! Our bamboo toilet paper is 100% septic safe and biodegradable. It breaks down quickly and won't clog pipes or harm septic systems.",
  },
  {
    question: "What is your return policy?",
    answer:
      "We offer a 30-day satisfaction guarantee. If you're not completely happy with your purchase, contact us for a full refund or exchange.",
  },
  {
    question: "Is the packaging eco-friendly?",
    answer:
      "Absolutely! All our packaging is plastic-free, made from recycled materials, and fully recyclable or compostable.",
  },
  {
    question: "Do you offer subscriptions?",
    answer:
      "Yes! Our subscription service delivers fresh rolls to your door monthly at a 20% discount. You can pause, skip, or cancel anytime.",
  },
  {
    question: "Where is your bamboo sourced?",
    answer:
      "Our bamboo is sustainably sourced from certified farms that practice responsible harvesting. We never use bamboo from protected forests.",
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
