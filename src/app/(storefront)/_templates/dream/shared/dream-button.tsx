import Link from "next/link";

import { cn } from "~/lib/utils";

type DreamButtonVariant = "primary" | "secondary" | "link";

type BaseProps = {
  children: React.ReactNode;
  className?: string;
  variant?: DreamButtonVariant;
};

type LinkProps = BaseProps & {
  href: string;
  external?: boolean;
  type?: never;
  onClick?: never;
  disabled?: never;
};

type ButtonProps = BaseProps & {
  href?: undefined;
  type?: "button" | "submit";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
};

type DreamButtonProps = LinkProps | ButtonProps;

/**
 * `primary` — ink pill, paper text (the site's one loud surface).
 * `secondary` — paper outline pill, hairline gold border.
 * `link` — no pill, rose underline treatment (delegates to `.dream-link`).
 *
 * Renders a Next `Link` when given `href`, otherwise a `<button>`. Hover
 * lift + soft offset shadow per design.md "Motion › Hover"; both zeroed by
 * the scoped reduced-motion block.
 */
export function DreamButton(props: DreamButtonProps) {
  const { children, className, variant = "primary" } = props;
  const classes = cn(
    variant === "link" ? "dream-link" : "dream-btn",
    variant === "secondary" && "dream-btn--secondary",
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
