import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

import { cn } from "~/lib/utils";

export type GloveButtonVariant =
  | "solid"
  | "outline"
  | "outlinePrimary"
  | "woo"
  | "wooOutline"
  | "story";
export type GloveButtonSize = "sm" | "md" | "lg";

type ButtonClassOptions = {
  variant?: GloveButtonVariant;
  size?: GloveButtonSize;
  /** White outline treatment for scrim, purple and plum bands. */
  onDark?: boolean;
  fullWidth?: boolean;
  className?: string;
};

/**
 * Class string for any element that should look like a glove button. Use it
 * on `<Link>` / `<a>` / `<button>` where `GloveButton` doesn't fit.
 *
 * - solid: purple fill
 * - outline: hairline ink to purple on hover (Load more)
 * - outlinePrimary: purple hairline + purple text, fills on hover (secondary action)
 * - woo: sentence-case 14px 600, 42px (Woo-style actions); wooOutline = woo + outlinePrimary
 * - story: Lato 18-22px Title Case
 * Every variant shares one radius (--glove-radius-btn, 5px).
 */
export function gloveButtonClass({
  variant = "solid",
  size = "md",
  onDark = false,
  fullWidth = false,
  className,
}: ButtonClassOptions = {}): string {
  return cn(
    "glove-btn",
    `glove-btn--${size}`,
    variant === "outline" && "glove-btn--outline",
    (variant === "woo" || variant === "wooOutline") && "glove-btn--woo",
    (variant === "outlinePrimary" || variant === "wooOutline") &&
      "glove-btn--outline-primary",
    variant === "story" && "glove-btn--story",
    onDark && "glove-btn--on-dark",
    onDark && "glove-on-dark",
    fullWidth && "w-full",
    className,
  );
}

type LinkProps = ButtonClassOptions & {
  href: string;
  external?: boolean;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

type NativeButtonProps = ButtonClassOptions & {
  href?: undefined;
  children: ReactNode;
} & Omit<ComponentProps<"button">, "className" | "children">;

/**
 * Button or link. With `href` it renders a Next `Link` (an `<a target=_blank>`
 * when `external`); otherwise a `<button type="button">`.
 */
export function GloveButton(props: LinkProps | NativeButtonProps) {
  if (props.href !== undefined) return <GloveLinkButton {...props} />;
  return <GloveNativeButton {...props} />;
}

function GloveLinkButton({
  variant,
  size,
  onDark,
  fullWidth,
  className,
  children,
  href,
  external,
  ...rest
}: LinkProps) {
  const classes = gloveButtonClass({
    variant,
    size,
    onDark,
    fullWidth,
    className,
  });
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {children}
        <span className="sr-only"> (opens in new tab)</span>
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}

function GloveNativeButton({
  variant,
  size,
  onDark,
  fullWidth,
  className,
  children,
  type,
  ...rest
}: NativeButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={gloveButtonClass({
        variant,
        size,
        onDark,
        fullWidth,
        className,
      })}
      {...rest}
    >
      {children}
    </button>
  );
}
