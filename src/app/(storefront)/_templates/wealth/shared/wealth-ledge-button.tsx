import Link from "next/link";

import { cn } from "~/lib/utils";

export type WealthLedgeButtonVariant =
  | "accent"
  | "donate"
  | "send"
  | "outline"
  | "forest";

type BaseProps = {
  children: React.ReactNode;
  className?: string;
  variant?: WealthLedgeButtonVariant;
  /**
   * Sits on a forest / primary block: the ledge shadow darkens to
   * `--wealth-ledge-on-dark` so it still reads (fill unchanged).
   */
  onDark?: boolean;
  /** `sm` = 40px compact (post cards, header). Default 48px. */
  size?: "md" | "sm";
  /** Full width of its container. */
  block?: boolean;
  "aria-label"?: string;
  id?: string;
};

type LinkProps = BaseProps & {
  href: string;
  external?: boolean;
  type?: never;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  disabled?: never;
};

type ButtonProps = BaseProps & {
  href?: undefined;
  type?: "button" | "submit";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

export type WealthLedgeButtonProps = LinkProps | ButtonProps;

/** The class list a ledge button renders with — for callers that need the
 *  look on an element this component can't render (e.g. a third-party Link). */
export function wealthLedgeButtonClasses({
  variant = "accent",
  onDark = false,
  size = "md",
  block = false,
  className,
}: Pick<
  BaseProps,
  "variant" | "onDark" | "size" | "block" | "className"
> = {}): string {
  return cn(
    "wealth-btn-mono",
    "wealth-btn-ledge",
    `wealth-btn-ledge--${variant}`,
    onDark && "wealth-btn-ledge--on-dark",
    size === "sm" && "wealth-btn-ledge--sm",
    block && "wealth-btn-ledge--block",
    className,
  );
}

/**
 * Mono-caps CTA on a flat fill with a hard 2px "ledge" shadow — no blur, no
 * rounding beyond the 3px button-only radius. Text on pale fills uses
 * `--wealth-btn-ink` (a11y deviation from the live site's white-on-sage,
 * which fails contrast — see design.md); `forest` uses white. Renders an
 * `<a>`/Next `Link` when given `href`, otherwise a `<button>`.
 *
 * Variants: accent (sage, default) · donate · send · outline (adopts the
 * color block's link color) · forest (for sage/surface blocks).
 * Modifiers: `onDark` (forest/primary blocks) · `size="sm"` · `block`.
 */
export function WealthLedgeButton(props: WealthLedgeButtonProps) {
  const { children, variant, onDark, size, block, className, id } = props;
  const classes = wealthLedgeButtonClasses({
    variant,
    onDark,
    size,
    block,
    className,
  });
  const ariaLabel = props["aria-label"];

  if ("href" in props && props.href !== undefined) {
    const { href, external, onClick } = props;
    const opensNewTab = external ?? /^https?:\/\//i.test(href);
    return (
      <Link
        href={href}
        id={id}
        className={classes}
        aria-label={ariaLabel}
        onClick={onClick}
        target={opensNewTab ? "_blank" : undefined}
        rel={opensNewTab ? "noopener noreferrer" : undefined}
      >
        {children}
        {opensNewTab ? (
          <span className="sr-only"> (opens in new tab)</span>
        ) : null}
      </Link>
    );
  }

  const { type = "button", onClick, disabled } = props;
  return (
    <button
      type={type}
      id={id}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={classes}
    >
      {children}
    </button>
  );
}
