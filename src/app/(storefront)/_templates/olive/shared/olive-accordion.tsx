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
import { Minus, Plus } from "lucide-react";

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
 * OliveAccordion — hairline rows that open in place (DETAILS / SIZE & FIT /
 * SHIPPING & RETURNS on the board). Tracked-caps triggers, a drawn Plus that
 * becomes a Minus when open, and the panel's 0fr ↔ 1fr collapse from
 * `.olive-accordion-panel-wrap` in globals.css.
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
      <div className={cn("olive-accordion flex flex-col", className)}>
        {children}
      </div>
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
 * OliveAccordionItem — one disclosure row.
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
    <div className={cn("olive-accordion-item", className)}>
      <TriggerHeading>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="olive-accordion-trigger"
        >
          <span className="olive-label">{title}</span>
          {open ? (
            <Minus
              aria-hidden="true"
              className="shrink-0"
              size={14}
              strokeWidth={1.5}
            />
          ) : (
            <Plus
              aria-hidden="true"
              className="shrink-0"
              size={14}
              strokeWidth={1.5}
            />
          )}
        </button>
      </TriggerHeading>

      {/* `grid-template-rows: 0fr ↔ 1fr` on this wrapper, not `max-height`, so a
          Tiptap image that loads in after the panel is already open never
          clips — the row re-measures instead of needing a guessed cap. The
          region itself carries `overflow: hidden` (the grid item) and the
          opacity fade; closed content gets `inert` so its links drop out of
          the tab order instead of merely hiding visually. Row value comes
          from the same `open` state `initialOpenIds` seeds, so server and
          client agree on first paint. */}
      <div
        className="olive-accordion-panel-wrap"
        data-open={open ? "true" : "false"}
      >
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          inert={!open}
          className="olive-accordion-panel"
        >
          <div className="olive-accordion-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
