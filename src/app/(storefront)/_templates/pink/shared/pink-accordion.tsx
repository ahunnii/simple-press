"use client";

import { useId, useState } from "react";

export type PinkAccordionItem = {
  id?: string;
  title: string;
  content: React.ReactNode;
};

type PinkAccordionProps = {
  items: PinkAccordionItem[];
  /** Index of the item open on mount. Omit to start fully closed. */
  defaultOpenIndex?: number;
  className?: string;
};

/**
 * Full-width button rows with a `+`/`−` rose indicator, `1px` bottom rules,
 * single-open behaviour, and real `aria-expanded`/`aria-controls` wiring
 * (design.md → Shared component inventory). Used by product panels and
 * service FAQs.
 */
export function PinkAccordion({
  items,
  defaultOpenIndex,
  className,
}: PinkAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(
    defaultOpenIndex ?? null,
  );
  const baseId = useId();

  return (
    <div className={className}>
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        const buttonId = `${baseId}-trigger-${i}`;
        const panelId = item.id ?? `${baseId}-panel-${i}`;

        return (
          <div
            key={panelId}
            style={{ borderBottom: "1px solid var(--pink-line)" }}
          >
            <h3 className="m-0">
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span
                  className="pink-display"
                  style={{
                    fontSize: "17px",
                    fontWeight: 600,
                    color: "var(--pink-ink)",
                  }}
                >
                  {item.title}
                </span>
                <span
                  aria-hidden="true"
                  className="pink-display shrink-0"
                  style={{
                    fontSize: "20px",
                    fontWeight: 400,
                    color: "var(--pink-rose)",
                  }}
                >
                  {isOpen ? "−" : "+"}
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="pb-5"
            >
              <div
                className="text-[15px] leading-[1.7]"
                style={{ color: "var(--pink-body)" }}
              >
                {item.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
