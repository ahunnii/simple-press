import type { CSSProperties, ReactNode } from "react";

export type ViiAccordionItemProps = {
  /**
   * Panel title rendered inside the <summary> element.
   * Accepts ReactNode for flexibility; the original source used plain strings
   * (e.g. "Details", "Shipping &amp; returns").
   */
  title: ReactNode;
  /** Panel body content. */
  children: ReactNode;
  /** When true the panel is open on first render. Mirrors <details open>. */
  defaultOpen?: boolean;
};

/**
 * ViiAccordionItem — single <details>/<summary> disclosure panel.
 *
 * Extracted from the inline AccordionItem function in vii-product-page.tsx
 * (lines 29-86). Reproduces its exact markup and styles verbatim:
 *   - borderBottom hairline on the <details> element
 *   - 20px block padding on <details>
 *   - Uppercase tracked sans-serif summary with copper "+" icon that rotates
 *     45° when open via the Tailwind group/group-open modifier pair
 *   - Sans-serif body text at 14px / 1.7 / ink-soft
 *
 * The `title` prop corresponds to the original `summary` prop (renamed to avoid
 * collision with the HTML <summary> element name).
 *
 * Usage with ViiAccordion wrapper (provides the opening top hairline):
 *   <ViiAccordion style={{ marginTop: 8 }}>
 *     <ViiAccordionItem title="Details" defaultOpen>…</ViiAccordionItem>
 *     <ViiAccordionItem title="Shipping &amp; returns">…</ViiAccordionItem>
 *   </ViiAccordion>
 *
 * Usage standalone (when the container's top border is handled externally):
 *   <ViiAccordionItem title="FAQ">…</ViiAccordionItem>
 */
export function ViiAccordionItem({
  title,
  children,
  defaultOpen,
}: ViiAccordionItemProps) {
  return (
    <details
      open={defaultOpen}
      className="group"
      style={{
        borderBottom: "1px solid var(--vii-hairline)",
        padding: "20px 0",
      }}
    >
      <summary
        className="[&::-webkit-details-marker]:hidden"
        style={{
          display: "flex",
          cursor: "pointer",
          listStyle: "none",
          alignItems: "center",
          justifyContent: "space-between",
          userSelect: "none",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--vii-navy)",
        }}
      >
        {title}
        <span
          aria-hidden="true"
          className="transition-transform duration-200 group-open:rotate-45"
          style={{ fontSize: 20, fontWeight: 300, color: "var(--vii-copper)" }}
        >
          +
        </span>
      </summary>
      <div
        style={{
          paddingTop: 14,
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          lineHeight: 1.7,
          color: "var(--vii-ink-soft)",
        }}
      >
        {children}
      </div>
    </details>
  );
}

export type ViiAccordionProps = {
  /** One or more ViiAccordionItem elements. */
  children: ReactNode;
  /**
   * Extra styles merged onto the container div.
   * The container provides the opening top hairline; callers typically add
   * marginTop here (the product page uses marginTop: 8).
   */
  style?: CSSProperties;
};

/**
 * ViiAccordion — thin container that supplies the opening top hairline border.
 *
 * Reproduces the outer wrapper div from vii-product-page.tsx (lines 353-358):
 *   <div style={{ marginTop: 8, borderTop: "1px solid var(--vii-hairline)" }}>
 *
 * The visual pattern is: ViiAccordion provides the first top rule; each
 * ViiAccordionItem provides its own bottom rule. Together they form a clean
 * stacked divider sequence.
 *
 * marginTop is intentionally NOT baked in — pass it via `style` since it
 * varies by context (product page: 8px; other call-sites may differ).
 */
export function ViiAccordion({ children, style }: ViiAccordionProps) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--vii-hairline)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
