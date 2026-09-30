import type { ReactNode } from "react";

type SledgeAccordionItemProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

/**
 * A single collapsible row, styled like the product page's spec accordions
 * (`.sl-product-accordion` in `globals.css`) so FAQ answers elsewhere in the
 * template match the same visual language. Plain `<details>`/`<summary>` —
 * no client JS needed, so this renders fine from an async server component
 * (e.g. `SledgeContactPage`).
 */
export function SledgeAccordionItem({
  title,
  children,
  defaultOpen = false,
}: SledgeAccordionItemProps) {
  return (
    <details
      open={defaultOpen}
      className="sl-product-accordion group border-b border-[var(--sl-border)] py-5 first:border-t"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 select-none [&::-webkit-details-marker]:hidden">
        {title}
        <span
          aria-hidden="true"
          className="font-sans text-xl font-light text-[var(--sl-ink-soft)] transition-transform duration-200 group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="sl-eyebrow pt-3.5 font-sans text-sm leading-[1.7]">
        {children}
      </div>
    </details>
  );
}
