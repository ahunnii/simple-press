import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "~/lib/utils";

/**
 * `solid` (espresso → moss-deep), `outline` (espresso hairline, fills on
 * hover), `on-photo` (ivory hairline + ivory type over a photograph),
 * `ivory` (ivory stock, espresso type) and `link` (tracked caps, underline
 * drawn on hover). The pre-2026-10-21 names are kept as aliases so older
 * call sites compile: `primary` → solid, `secondary` → outline, `ghost` → link.
 */
export type OliveButtonVariant =
  | "solid"
  | "outline"
  | "on-photo"
  | "ivory"
  | "link"
  | "primary"
  | "secondary"
  | "ghost";
export type OliveButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<OliveButtonVariant, string> = {
  solid: "olive-btn-solid",
  outline: "olive-btn-outline",
  "on-photo": "olive-btn-on-photo",
  ivory: "olive-btn-ivory",
  link: "olive-btn-link",
  // Aliases also keep their old class so existing selectors/tests still match.
  primary: "olive-btn-solid olive-btn-primary",
  secondary: "olive-btn-outline olive-btn-secondary",
  ghost: "olive-btn-link olive-btn-ghost",
};

const SIZE_CLASS: Record<OliveButtonSize, string | null> = {
  sm: "olive-btn-sm",
  md: null,
  lg: "olive-btn-lg",
};

type OliveButtonProps = {
  children: ReactNode;
  variant: OliveButtonVariant;
  /** Heights 44 / 48 / 52px (`link` ignores height). Default `md`. */
  size?: OliveButtonSize;
  /** Trailing drawn arrow (lucide ArrowRight, 14px) that nudges 3px on hover. */
  arrow?: boolean;
  /** When set the control renders as a link. Internal hrefs go through next/link. */
  href?: string;
  /** Ignored on links. Defaults to `button` so a control inside a form never submits by accident. */
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  /** Shows a spinner, blocks activation and sets `aria-busy`. */
  loading?: boolean;
  /**
   * Plays a ~460ms press-commit once — `scale(1) → 0.97 → 1` with the face
   * warming toward `--olive-sand` — so the click that added something to
   * the bag has a surface response of its own, connecting it to the toast and
   * badge that follow. The caller owns the timing: flip it true, then false
   * again after the animation (see `olive-buy-row.tsx`'s `onAdd`). Never
   * changes `children` — the confirmation stays the toast and the badge, not
   * a button that changes its mind about what it says.
   */
  committed?: boolean;
  className?: string;
  style?: CSSProperties;
  target?: string;
  rel?: string;
  title?: string;
  "aria-label"?: string;
  "aria-controls"?: string;
  "aria-expanded"?: boolean;
  "aria-describedby"?: string;
  "data-sp-field"?: string;
};

/**
 * OliveButton — the template's one control shape: a square rectangle in
 * tracked caps (design.md § Components).
 *
 * Composes the chrome's `olive-btn` with a variant and an optional size; it
 * authors no styles of its own. See `OliveButtonVariant` for the five looks.
 *
 * Renders `<button>` by default and a next/link `<a>` when `href` is set. A
 * link that is `disabled` or `loading` degrades to a non-interactive `<span>`
 * carrying `aria-disabled` — an anchor cannot be disabled, and leaving it
 * clickable is worse than dropping the role.
 */
export function OliveButton({
  children,
  variant,
  size = "md",
  arrow = false,
  href,
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  committed = false,
  className,
  style,
  target,
  rel,
  title,
  "aria-label": ariaLabel,
  "aria-controls": ariaControls,
  "aria-expanded": ariaExpanded,
  "aria-describedby": ariaDescribedby,
  "data-sp-field": dataSpField,
}: OliveButtonProps) {
  const inert = disabled || loading;
  const classes = cn(
    "olive-btn",
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    className,
  );

  const body = (
    <>
      {loading ? <OliveButtonSpinner /> : null}
      {children}
      {arrow ? (
        <ArrowRight
          aria-hidden="true"
          className="olive-btn-arrow"
          size={14}
          strokeWidth={1.5}
        />
      ) : null}
    </>
  );

  const shared = {
    className: classes,
    style,
    title,
    "aria-label": ariaLabel,
    "aria-controls": ariaControls,
    "aria-expanded": ariaExpanded,
    "aria-describedby": ariaDescribedby,
    "data-sp-field": dataSpField,
    "data-commit": committed ? "true" : undefined,
  };

  if (href !== undefined) {
    if (inert) {
      return (
        <span {...shared} aria-disabled="true" aria-busy={loading || undefined}>
          {body}
        </span>
      );
    }
    return (
      <Link {...shared} href={href} target={target} rel={rel}>
        {body}
      </Link>
    );
  }

  return (
    <button
      {...shared}
      type={type}
      onClick={onClick}
      disabled={inert}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
    >
      {body}
    </button>
  );
}

/**
 * The one moving part a button owns: a 14px ring in `currentColor` with its
 * top edge cut away. Stops turning under reduced motion.
 */
function OliveButtonSpinner() {
  return (
    <span
      aria-hidden="true"
      className="animate-spin motion-reduce:animate-none"
      style={{
        width: "0.875rem",
        height: "0.875rem",
        borderRadius: "999px",
        border: "1.5px solid currentColor",
        flex: "none",
        borderTopColor: "transparent",
      }}
    />
  );
}
