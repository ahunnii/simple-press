import { cn } from "~/lib/utils";

/**
 * Mono-caps overline used for group labels, mini-heads, and CTA context
 * ("DONATE TO DETROIT COMMUNITY WEALTH FUND."). See `.wealth-eyebrow` in
 * globals.css for the type spec (Roboto Mono, uppercase, letterspaced,
 * a11y-darkened per design.md's accessibility deviations to `--wealth-eyebrow`).
 * Extra props (e.g. the editor's `fieldAttr` data attributes) are forwarded
 * to the underlying element — do not strip them.
 */
export function WealthEyebrow({
  children,
  className,
  as: Tag = "span",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "p" | "div";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("wealth-eyebrow", className)} {...rest}>
      {children}
    </Tag>
  );
}
