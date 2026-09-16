"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "~/lib/utils";

type AccordionContextValue = {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

type BambooAccordionProps = {
  children: ReactNode;
  /** Every item toggles independently -- readers can compare answers side by side. */
  type?: "multiple";
  className?: string;
};

/**
 * BambooAccordion -- a stack of hairline cream cards that open in place.
 *
 * Modeled on olive's accordion (context-based open state, real `<button>`
 * inside an `<h3>`, `hidden` panels) but restyled to bamboo's cream/gold/
 * hairline card language -- the same card treatment as the contact sidebar.
 */
export function BambooAccordion({ children, className }: BambooAccordionProps) {
  const [open, setOpen] = useState<string[]>([]);

  const value: AccordionContextValue = {
    isOpen: (id) => open.includes(id),
    toggle: (id) =>
      setOpen((current) =>
        current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id],
      ),
  };

  return (
    <AccordionContext.Provider value={value}>
      <div className={cn("space-y-4", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

type BambooAccordionItemProps = {
  /** Stable id -- also the key the parent uses to track open state. */
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
};

/**
 * BambooAccordionItem -- one disclosure card.
 *
 * The trigger is a real button inside an `h3`, so panel titles surface in a
 * screen reader's heading list and the region is labelled by the button that
 * controls it.
 */
export function BambooAccordionItem({
  id,
  title,
  children,
  className,
}: BambooAccordionItemProps) {
  const context = useContext(AccordionContext);
  const generated = useId();
  // Only consulted when rendered outside a BambooAccordion.
  const [standalone, setStandalone] = useState(false);

  const open = context ? context.isOpen(id) : standalone;
  const onToggle = () =>
    context ? context.toggle(id) : setStandalone((value) => !value);

  const buttonId = `${generated}-trigger`;
  const panelId = `${generated}-panel`;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[var(--bam-hairline)] bg-[var(--bam-cream-deep)]",
        className,
      )}
    >
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="focus-visible:ring-ring flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:text-[var(--bam-forest)] focus-visible:rounded-2xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <span className="text-foreground font-semibold">{title}</span>
          <ChevronDown
            aria-hidden="true"
            className="size-5 shrink-0 text-[var(--bam-gold)] transition-transform duration-200 motion-reduce:transition-none"
            style={{ transform: open ? "rotate(180deg)" : undefined }}
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className="text-muted-foreground px-6 pb-5"
      >
        {children}
      </div>
    </div>
  );
}
