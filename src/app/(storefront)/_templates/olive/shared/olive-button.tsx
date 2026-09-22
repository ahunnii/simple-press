import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

import { cn } from "~/lib/utils";

export type OliveButtonVariant = "primary" | "secondary" | "ghost";
export type OliveButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<OliveButtonVariant, string> = {
  primary: "olive-btn-primary",
  secondary: "olive-btn-secondary",
  ghost: "olive-btn-ghost",
};

const SIZE_CLASS: Record<OliveButtonSize, string | null> = {
  sm: "olive-btn-sm",
  md: null,
  lg: "olive-btn-lg",
};

type OliveButtonProps = {
  children: ReactNode;
  variant: OliveButtonVariant;
  size?: OliveButtonSize;
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
   * warming toward `--olive-sage-tint` — so the click that added something to
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
 * OliveButton — the template's one control shape.
 *
 * Composes the chrome's `olive-btn` pill with a variant and an optional size;
 * it authors no styles of its own. `primary` is the sage field with white
 * type, `secondary` the white card face with a hairline, `ghost` a leaf text
 * link with a sage-bright underline (no pill, no side padding at any size).
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
        borderTopColor: "transparent",
      }}
    />
  );
}
