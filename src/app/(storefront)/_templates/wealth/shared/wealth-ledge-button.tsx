import Link from "next/link";

import { cn } from "~/lib/utils";

type WealthLedgeButtonVariant = "accent" | "donate" | "send" | "outline";

type BaseProps = {
  children: React.ReactNode;
  className?: string;
  variant?: WealthLedgeButtonVariant;
};

type LinkProps = BaseProps & {
  href: string;
  external?: boolean;
  type?: never;
  onClick?: never;
};

type ButtonProps = BaseProps & {
  href?: undefined;
  type?: "button" | "submit";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

type WealthLedgeButtonProps = LinkProps | ButtonProps;

/**
 * Mono-caps CTA on a flat fill with a hard 2px "ledge" shadow — no blur, no
 * rounding beyond the 3px button-only radius. Text always uses
 * `--wealth-btn-ink` (a11y deviation from the live site's white-on-sage,
 * which fails contrast — see design.md). Renders an `<a>`/Next `Link` when
 * given `href`, otherwise a `<button>`.
 */
export function WealthLedgeButton(props: WealthLedgeButtonProps) {
  const { children, className, variant = "accent" } = props;
  const classes = cn(
    "wealth-btn-mono",
    "wealth-btn-ledge",
    `wealth-btn-ledge--${variant}`,
    className,
  );

  if ("href" in props && props.href !== undefined) {
    const { href, external } = props;
    const opensNewTab = external ?? /^https?:\/\//i.test(href);
    return (
      <Link
        href={href}
        className={classes}
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
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
}
