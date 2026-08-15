import Link from "next/link";

import { cn } from "~/lib/utils";

/**
 * The template's one button shape (design.md → Typography / Motion):
 * omnes-pro, 12px radius, `border-2`, `py-[0.5625rem] px-6`, 0.45px tracking,
 * uppercase where the source is. Hover drops to opacity .8 over 100ms linear
 * (`.relocation-hover-fade`, defined in the globals.css `.relocation` block).
 *
 * Variants
 *  - `solid`        — terracotta fill + white text/border (header call pill,
 *                     "Check It Out" brochure CTA)
 *  - `outline-light`— transparent fill, white border + text; for use on the
 *                     wave-hero gradient ("CALL US TODAY")
 *  - `solid-deep`   — deeper terracotta fill for form submits
 *                     ("Continue to Free Estimate")
 *
 * Renders an `<a>`/`<Link>` when `href` is given, otherwise a `<button>`.
 */

export type RelocationPillVariant = "solid" | "outline-light" | "solid-deep";

const VARIANT_CLASS: Record<RelocationPillVariant, string> = {
  solid:
    "border-[var(--relocation-paper)] bg-[var(--relocation-terracotta)] text-[var(--relocation-paper)]",
  "outline-light":
    "border-[var(--relocation-paper)] bg-transparent text-[var(--relocation-paper)]",
  "solid-deep":
    "border-[var(--relocation-terracotta-deep)] bg-[var(--relocation-terracotta-deep)] text-[var(--relocation-paper)]",
};

const BASE_CLASS =
  "relocation-hover-fade inline-block cursor-pointer rounded-[var(--relocation-radius)] border-2 border-solid px-6 py-[0.5625rem] text-center text-[1.0625rem] leading-5 tracking-[0.45px] [font-family:var(--font-relocation-display)]";

type CommonProps = {
  children: React.ReactNode;
  variant?: RelocationPillVariant;
  /** Uppercase the label — the source does this on every pill but the quote submit. */
  uppercase?: boolean;
  className?: string;
  /** Spread visual-editor annotations (`fieldAttr(...)`) onto the label element. */
  labelAttrs?: Record<string, string>;
};

type Props = CommonProps & {
  href?: string;
  /** Only used when `href` is omitted. */
  type?: "button" | "submit";
  disabled?: boolean;
};

export function RelocationPillButton({
  children,
  href,
  variant = "solid",
  uppercase = true,
  className,
  labelAttrs,
  type = "button",
  disabled,
}: Props) {
  const classes = cn(
    BASE_CLASS,
    VARIANT_CLASS[variant],
    uppercase && "uppercase",
    className,
  );
  const label = <span {...labelAttrs}>{children}</span>;

  if (href) {
    // `tel:` / `mailto:` / `https:` targets are plain anchors (a scheme is the
    // only thing that can contain a colon here); internal routes get <Link>.
    if (href.includes(":")) {
      return (
        <a href={href} className={classes}>
          {label}
        </a>
      );
    }
    return (
      <Link href={href} className={classes}>
        {label}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled}>
      {label}
    </button>
  );
}
