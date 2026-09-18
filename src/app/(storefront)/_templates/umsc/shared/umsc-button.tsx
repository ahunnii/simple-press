import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

type CommonProps = {
  children: ReactNode;
  variant?: "gold" | "ghost" | "link";
  /** Full template field key for the resolved text passed as `children`. */
  fieldKey?: string;
  className?: string;
  style?: CSSProperties;
  showArrow?: boolean;
};

type LinkProps = CommonProps & {
  as?: "link";
  href: string;
  external?: boolean;
};

type ButtonProps = CommonProps & {
  as: "button";
  href?: never;
  external?: never;
  type?: "button" | "submit";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  "aria-label"?: string;
};

type Props = LinkProps | ButtonProps;

/**
 * UmscButton — the three link/CTA treatments used throughout umsc:
 *   - `gold`: solid gold pill, near-black text (primary action)
 *   - `ghost`: outlined pill in currentColor (secondary action; fills
 *     gold-ink on hover for the product add-to-cart case, see
 *     `.umsc-btn-ghost` in globals.css)
 *   - `link`: gold-ink text link with a trailing arrow that nudges on hover
 *
 * Renders a Next.js `<Link>` by default (`as="link"`, requires `href`), or a
 * native `<button>` when `as="button"` is passed.
 */
export function UmscButton(props: Props) {
  const {
    children,
    variant = "gold",
    fieldKey,
    className,
    style,
    showArrow,
  } = props;

  const isLinkVariant = variant === "link";
  const classes = cn(
    "umsc-btn",
    variant === "gold" && "umsc-btn-gold",
    variant === "ghost" && "umsc-btn-ghost",
    isLinkVariant && "umsc-btn-link",
    className,
  );

  const content = (
    <>
      <span {...(fieldKey ? fieldAttr(fieldKey) : {})}>{children}</span>
      {isLinkVariant && (showArrow ?? true) && (
        <ArrowRight
          aria-hidden="true"
          className="umsc-btn-link-arrow size-[14px]"
        />
      )}
    </>
  );

  if (props.as === "button") {
    return (
      <button
        type={props.type ?? "button"}
        onClick={props.onClick}
        disabled={props.disabled}
        aria-label={props["aria-label"]}
        className={classes}
        style={style}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={props.href}
      target={props.external ? "_blank" : undefined}
      rel={props.external ? "noopener noreferrer" : undefined}
      className={classes}
      style={style}
    >
      {content}
      {props.external && <span className="sr-only"> (opens in new tab)</span>}
    </Link>
  );
}
