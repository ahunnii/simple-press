"use client";

import type { ReactNode } from "react";
import { useId, useState } from "react";

import { cn } from "~/lib/utils";

export type UmscAccordionItemProps = {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
};

/**
 * UmscAccordionItem — hairline-row disclosure. Keyboard-operable native
 * `<button aria-expanded>` (not `<details>`, so the panel can animate via a
 * `grid-template-rows: 0fr → 1fr` transition instead of the abrupt
 * details/summary toggle). The plus icon rotates 45° into a minus and the
 * open row gets a purple left marker (see `.umsc-accordion-*` in globals.css).
 */
export function UmscAccordionItem({
  title,
  children,
  defaultOpen = false,
}: UmscAccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const triggerId = `${panelId}-trigger`;

  return (
    <div className="umsc-accordion-row" data-open={open || undefined}>
      <h3 className="m-0">
        <button
          type="button"
          id={triggerId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="umsc-accordion-trigger"
        >
          <span>{title}</span>
          <span aria-hidden="true" className="umsc-accordion-icon">
            <span className="umsc-accordion-icon-h" />
            <span className="umsc-accordion-icon-v" />
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className="umsc-accordion-panel"
      >
        <div className="umsc-accordion-panel-inner">{children}</div>
      </div>
    </div>
  );
}

type AccordionProps = {
  children: ReactNode;
  className?: string;
};

/** UmscAccordion — thin container supplying the opening top hairline. */
export function UmscAccordion({ children, className }: AccordionProps) {
  return <div className={cn("umsc-accordion", className)}>{children}</div>;
}
