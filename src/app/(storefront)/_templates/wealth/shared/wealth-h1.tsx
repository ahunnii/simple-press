import { cn } from "~/lib/utils";

/**
 * Page-title heading — Jost display, sentence case, modest clamp (design.md
 * pins near the site's px values rather than fluid-scaling aggressively).
 * Extra props (e.g. the editor's `fieldAttr` data attributes) are forwarded
 * to the underlying element — do not strip them.
 */
export function WealthH1({
  children,
  className,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 className={cn("wealth-h1", className)} {...rest}>
      {children}
    </h1>
  );
}
