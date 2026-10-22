import type { CSSProperties, ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { OliveButton } from "./olive-button";

type OliveEmptyStateProps = {
  heading: string;
  body?: string;
  /** Rendered as the `outline` button with an arrow. */
  cta?: { label: string; href: string };
  /**
   * A single big Bodoni numeral drawn above the heading — the cart's "0", a filtered
   * grid's count. Absence gets drawn deliberately rather than left blank.
   */
  numeral?: string;
  /** Heading level. Defaults to `h3` — most empty states sit under a section heading. */
  headingAs?: "h2" | "h3" | "p";
  /** Extra content below the body (a second link, a hint). */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Full template field keys, when `heading` / `body` are live-patchable fields. */
  headingFieldKey?: string;
  bodyFieldKey?: string;
};

/**
 * OliveEmptyState — absence, drawn on purpose.
 *
 * A square frame between two strong hairlines (`olive-ghost-card`), an
 * optional Bodoni numeral, one heading, one line, one button. Every "there is nothing here" surface in the template uses this
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
  headingFieldKey,
  bodyFieldKey,
}: OliveEmptyStateProps) {
  const Heading = headingAs;

  return (
    <div className={cn("olive-ghost-card", className)} style={style}>
      {numeral ? (
        <span
          aria-hidden="true"
          className="olive-serif"
          style={{
            fontWeight: 400,
            fontSize: "5.5rem",
            lineHeight: 0.9,
            letterSpacing: "-0.02em",
            color: "var(--olive-taupe)",
          }}
        >
          {numeral}
        </span>
      ) : null}

      <Heading
        className="olive-h3"
        {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
      >
        {heading}
      </Heading>

      {body ? (
        <p
          className="olive-caption max-w-[46ch]"
          {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
        >
          {body}
        </p>
      ) : null}

      {cta ? (
        <OliveButton variant="outline" arrow href={cta.href} className="mt-2">
          {cta.label}
        </OliveButton>
      ) : null}

      {children}
    </div>
  );
}
