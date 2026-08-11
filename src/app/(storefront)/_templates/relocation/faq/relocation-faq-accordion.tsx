"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "~/lib/utils";

/**
 * The FAQ accordion — hairline-separated disclosure rows, exactly as the
 * reference screenshot renders them (docs/relocation/"FAQ _ Handy
 * Relocations.jpeg"): a large omnes-pro question on the left, a chevron on the
 * right that flips when the row is open, and the answer in body type beneath.
 *
 * Fixes the source outright (design.md deviation #4): handyrelocations.com
 * shipped one of four rows wired, every panel `hidden`, and every answer
 * paragraph frozen at `opacity: 0`. Here EVERY row is wired, answers are
 * genuinely visible when open, and rows open independently of one another —
 * which is what the source's four separate `aria-expanded` buttons implied.
 *
 * Rows start OPEN because that is the state the ground-truth screenshot
 * captures (all four carets pointing up, all four answers on screen), and it
 * keeps the answers in the initial HTML for readers and crawlers alike.
 *
 * Accessibility / motion:
 *  - Each question is a real `<button>` inside an `<h3>`, carrying
 *    `aria-expanded` and `aria-controls`; the panel is a `role="region"`
 *    labelled by the button. Ids are derived from the DB row id, so they're
 *    unique on the page.
 *  - Collapsed panels are `inert`, so their text leaves the tab order and the
 *    accessibility tree instead of lurking at zero height.
 *  - The open/close animation is a `grid-template-rows` 0fr→1fr transition —
 *    no measurement, no layout thrash, and it adapts to any answer length.
 *    `motion-reduce:transition-none` removes it under
 *    `prefers-reduced-motion: reduce`, where rows snap instead.
 */

export type RelocationFaqRow = {
  id: string;
  question: string;
  answer: string;
};

export function RelocationFaqAccordion({
  items,
}: {
  items: RelocationFaqRow[];
}) {
  const [closedIds, setClosedIds] = useState<string[]>([]);

  const toggle = (id: string) =>
    setClosedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );

  return (
    <ul className="w-full list-none border-t border-[var(--relocation-border)]">
      {items.map((item) => {
        const open = !closedIds.includes(item.id);
        const buttonId = `relocation-faq-button-${item.id}`;
        const panelId = `relocation-faq-panel-${item.id}`;

        return (
          <li
            key={item.id}
            className="border-b border-[var(--relocation-border)]"
          >
            <h3 className="[font-family:var(--font-relocation-display)] text-[1.9375rem] leading-[2.1875rem] font-semibold text-[var(--relocation-charcoal)] min-[1025px]:text-[2.5625rem] min-[1025px]:leading-[2.875rem]">
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="relocation-hover-fade flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left"
              >
                <span className="flex-1">{item.question}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "size-6 shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none",
                    open && "rotate-180",
                  )}
                />
              </button>
            </h3>

            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!open}
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-[46rem] pb-7 text-[var(--relocation-ink)]">
                  {item.answer}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
