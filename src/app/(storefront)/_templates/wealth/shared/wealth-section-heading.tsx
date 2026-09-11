import { cn } from "~/lib/utils";

/**
 * Section H2 — italic PT Sans, the site's signature quiet whisper. Used for
 * every section heading ("Our Mission", "What Is a Cooperative?", "Meet the
 * Co-ops", etc). Sentence case, never uppercase (buttons/eyebrows are mono
 * caps instead — see `WealthEyebrow`).
 * Extra props (e.g. the editor's `fieldAttr` data attributes) are forwarded
 * to the underlying element — do not strip them.
 */
export function WealthSectionHeading({
  children,
  className,
  as: Tag = "h2",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h2" | "h3";
} & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <Tag className={cn("wealth-section-heading", className)} {...rest}>
      {children}
    </Tag>
  );
}
