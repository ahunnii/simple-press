import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Props = {
  children: ReactNode;
  /** "span" (default) for use inside a parent `<Link>`; "link" renders its own next/link. */
  as?: "span" | "link";
  /** Required when as="link". */
  href?: string;
  className?: string;
};

/**
 * Mono-caps "read more" affordance — the wealth analogue of vii's
 * `ViiBlogReadLink`, styled with the mono-button type spec instead of a
 * bordered link so it reads as an action, not a body-copy underline.
 */
export function WealthBlogReadLink({
  children,
  as = "span",
  href,
  className,
}: Props) {
  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "var(--font-wealth-mono)",
    fontSize: 12,
    letterSpacing: "1.57px",
    textTransform: "uppercase",
    fontWeight: 500,
    color: "var(--wealth-primary)",
    textDecoration: "none",
  };

  const icon = <ArrowRight aria-hidden="true" style={{ width: 12, height: 12 }} />;

  if (as === "link") {
    return (
      <Link href={href ?? "/blog"} style={style} className={className}>
        {children}
        {icon}
      </Link>
    );
  }

  return (
    <span aria-hidden="true" style={style} className={className}>
      {children}
      {icon}
    </span>
  );
}
