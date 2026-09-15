"use client";

import type { ReactNode } from "react";
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useId,
  useState,
} from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "~/lib/utils";

type AccordionContextValue = {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

type OliveAccordionProps = {
  children: ReactNode;
  /**
   * `single` (default) closes the others when one opens — the product page's
   * Details / Shipping / Returns stack. `multiple` lets an FAQ stay open while
   * the reader compares answers.
   */
  type?: "single" | "multiple";
  className?: string;
};

/**
 * Read the initial open set off the children's own `defaultOpen`, once, in a
 * lazy state initializer — so the first paint on the server and the first
 * paint on the client agree and nothing pops open after hydration. Items must
 * be direct children of the accordion for this to see them.
 */
function initialOpenIds(children: ReactNode, type: "single" | "multiple") {
  const ids: string[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    const props = child.props as { id?: unknown; defaultOpen?: unknown };
    if (typeof props.id === "string" && props.defaultOpen === true) {
      ids.push(props.id);
    }
  }
  return type === "single" ? ids.slice(0, 1) : ids;
}

/**
 * OliveAccordion — stacked cards that open in place.
 *
 * Each panel is one `olive-card`, so a group of them reads as the same swatch
 * stock as everything else on the page rather than as a list of rules. The
 * chevron is the only moving part and it stops turning under reduced motion.
 */
export function OliveAccordion({
  children,
  type = "single",
  className,
}: OliveAccordionProps) {
  const [open, setOpen] = useState<string[]>(() =>
    initialOpenIds(children, type),
  );

  const value: AccordionContextValue = {
    isOpen: (id) => open.includes(id),
    toggle: (id) =>
      setOpen((current) => {
        if (current.includes(id)) return current.filter((x) => x !== id);
        return type === "single" ? [id] : [...current, id];
      }),
  };

  return (
    <AccordionContext.Provider value={value}>
      <div className={cn("flex flex-col gap-2", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

type OliveAccordionItemProps = {
  /** Stable id — also the key the parent uses to track open state. */
  id: string;
  title: string;
  children: ReactNode;
  /**
   * Open on first paint. Read once by the parent accordion (and, when the item
   * is used on its own, by the item itself). Changing it later does nothing.
   */
  defaultOpen?: boolean;
  className?: string;
  /** Heading level wrapping the trigger. Use 2 when the accordion sits directly under the page h1. Default 3. */
  headingLevel?: 2 | 3;
};

/**
 * OliveAccordionItem — one disclosure card.
 *
 * The trigger is a real button inside an `h3`, so the panel titles show up in
 * a screen reader's heading list and the region is labelled by the button that
 * controls it.
 */
export function OliveAccordionItem({
  id,
  title,
  children,
  defaultOpen = false,
  className,
  headingLevel = 3,
}: OliveAccordionItemProps) {
  const TriggerHeading = headingLevel === 2 ? "h2" : "h3";
  const context = useContext(AccordionContext);
  const generated = useId();
  // Only consulted when the item is rendered outside an `OliveAccordion`;
  // inside one, the parent already read `defaultOpen` off this element.
  const [standalone, setStandalone] = useState(defaultOpen);

  const open = context ? context.isOpen(id) : standalone;
  const onToggle = () =>
    context ? context.toggle(id) : setStandalone((value) => !value);

  const buttonId = `${generated}-trigger`;
  const panelId = `${generated}-panel`;

  return (
    <div className={cn("olive-card overflow-hidden", className)}>
      <TriggerHeading>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
        >
          <span className="olive-h3" style={{ fontSize: "1.0625rem" }}>
            {title}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 shrink-0 transition-transform duration-200 ease-[var(--olive-ease)] motion-reduce:transition-none"
            style={{
              color: "var(--olive-leaf)",
              transform: open ? "rotate(180deg)" : undefined,
            }}
          />
        </button>
      </TriggerHeading>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className="px-4 pb-4 text-[0.9375rem] leading-relaxed"
        style={{ color: "var(--olive-ink-soft)" }}
      >
        {children}
      </div>
    </div>
  );
}
