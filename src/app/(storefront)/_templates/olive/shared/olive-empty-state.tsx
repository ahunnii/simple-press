import type { CSSProperties, ReactNode } from "react";

import { cn } from "~/lib/utils";

import { OliveButton } from "./olive-button";
import { OliveLeafMark } from "./olive-leaf-mark";

type OliveEmptyStateProps = {
  heading: string;
  body?: string;
  /** Rendered as the secondary (white pill) button. */
  cta?: { label: string; href: string };
  /**
   * A single big numeral drawn above the mark — the cart's "0", a filtered
   * grid's count. Absence gets drawn deliberately rather than left blank.
   */
  numeral?: string;
  /** Heading level. Defaults to `h3` — most empty states sit under a section heading. */
  headingAs?: "h2" | "h3" | "p";
  /** Extra content below the body (a second link, a hint). */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * OliveEmptyState — the ghost card.
 *
 * Dashed hairline on the paper face, the leaf rivet, one heading, one line,
 * one button. Every "there is nothing here" surface in the template uses this
 * one card so an empty shop, an empty bag and an empty order list are
 * recognisably the same event rather than three different blanks.
 *
 * Every visible string is a prop: empty-state copy is page copy, and it has
 * to be specific to be kind ("Nothing in your bag yet" beats "No items").
 */
export function OliveEmptyState({
  heading,
  body,
  cta,
  numeral,
  headingAs = "h3",
  children,
  className,
  style,
}: OliveEmptyStateProps) {
  const Heading = headingAs;

  return (
    <div className={cn("olive-ghost-card", className)} style={style}>
      {numeral ? (
        <span
          aria-hidden="true"
          style={{
            fontFamily: "var(--olive-font-display)",
            fontWeight: 300,
            fontSize: "6rem",
            lineHeight: 0.9,
            letterSpacing: "-0.02em",
            color: "var(--olive-slate)",
          }}
        >
          {numeral}
        </span>
      ) : null}

      <span
        className="flex items-center"
        style={{ color: "var(--olive-leaf)" }}
      >
        <OliveLeafMark size={22} />
      </span>

      <Heading className="olive-h3">{heading}</Heading>

      {body ? <p className="olive-caption max-w-[46ch]">{body}</p> : null}

      {cta ? (
        <OliveButton variant="secondary" href={cta.href} className="mt-1">
          {cta.label}
        </OliveButton>
      ) : null}

      {children}
    </div>
  );
}
