"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";

type Item = { id: string; question: string; answer: string };

/**
 * The contact page's FAQ rows (hairline-ruled, 15px DM Sans question, a
 * plus that turns into a cross), as a standalone accordion for `/faq`.
 *
 * Built on the Radix primitive directly so each question can sit in an
 * `h2` — the rows sit straight under the page h1, and the shared shadcn
 * `AccordionTrigger` hard-codes an `h3`. `type="multiple"` lets a reader
 * keep several answers open to compare them. Keyboard: Tab between
 * questions, Enter/Space to toggle, arrows move between triggers.
 */
export function NoiseFaqAccordion({ items }: { items: Item[] }) {
  return (
    <AccordionPrimitive.Root
      type="multiple"
      className="border-t-2 border-(--vn-ink)"
    >
      {items.map((item) => (
        <AccordionPrimitive.Item
          key={item.id}
          value={item.id}
          className="border-b border-(--vn-rule)"
        >
          <AccordionPrimitive.Header asChild>
            <h2>
              <AccordionPrimitive.Trigger className="group flex w-full items-start justify-between gap-6 py-6 text-left">
                <span className="font-sans text-[15px] leading-snug text-(--vn-ink) transition-opacity group-hover:opacity-70">
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 font-mono text-[15px] leading-none text-(--vn-steel-mist) transition-transform duration-200 group-data-[state=open]:rotate-45 motion-reduce:transition-none"
                >
                  +
                </span>
              </AccordionPrimitive.Trigger>
            </h2>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden motion-reduce:animate-none">
            <p
              className="pb-6 font-sans text-[14px] leading-[1.85] whitespace-pre-wrap text-(--vn-steel-mist)"
              style={{ maxWidth: "68ch" }}
            >
              {item.answer}
            </p>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
