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
    question: "What is your toilet tissue made from?",
    answer:
      "Our toilet tissue is made from bamboo pulp, a renewable and eco-friendly alternative to traditional tree-based paper.",
  },
  {
    question: "Is your product free from harsh chemicals?",
    answer:
      "We formulate our tissue without harsh chemicals or added fragrances, making it a gentle choice for everyday use.",
  },
  {
    question: "Is it a good option for sensitive skin?",
    answer:
      "Our toilet tissue is designed to be soft and gentle, making it a great choice for sensitive skin.",
  },
  {
    question:
      "How does bamboo toilet tissue compare to regular toilet paper?",
    answer:
      "Our multi-ply design is crafted to deliver softness and durability comparable to traditional brands.",
  },
  {
    question: "Where can I purchase your products?",
    answer:
      "You can order directly through our online shop. Check back for updates as we expand availability.",
  },
  {
    question: "Do you ship nationwide?",
    answer:
      "Yes, we ship to customers across the country. Delivery times may vary depending on your location.",
  },
  {
    question: "What if I have a question about my order?",
    answer:
      "Reach out through our contact page and our team will be happy to help.",
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
