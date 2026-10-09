import type { ReactNode } from "react";
import { useId } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "~/lib/utils";

export type GloveAccordionItem = {
  id: string;
  question: ReactNode;
  answer: ReactNode;
};

type GloveAccordionProps = {
  items: GloveAccordionItem[];
  /** Index of the row open on first render. Default 0; -1 opens none. */
  defaultOpenIndex?: number;
  className?: string;
};

/**
 * Hairline accordion on native `<details>` (works without JS). Rows share a
 * `name` so opening one closes the others in browsers that support it.
 */
export function GloveAccordion({
  items,
  defaultOpenIndex = 0,
  className,
}: GloveAccordionProps) {
  const group = useId();
  return (
    <div className={cn("border-t border-[var(--glove-line)]", className)}>
      {items.map((item, i) => (
        <details
          key={item.id}
          name={group}
          open={i === defaultOpenIndex}
          className="glove-accordion-row"
        >
          <summary>
            <span>{item.question}</span>
            <ChevronDown
              className="glove-accordion-chevron size-5 text-[var(--glove-primary)]"
              aria-hidden="true"
            />
          </summary>
          <div className="max-w-[52ch] pb-5 text-[15px] leading-relaxed text-[var(--glove-text)]">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
