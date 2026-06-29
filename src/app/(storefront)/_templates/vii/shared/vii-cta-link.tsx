import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Props = {
  href: string;
  children: ReactNode;
  /** Show the trailing ArrowRight icon. Default true. */
  showArrow?: boolean;
  style?: CSSProperties;
  className?: string;
};

/**
 * ViiCtaLink — the copper-underline uppercase call-to-action link used
 * throughout the vii template (product rail, blog section, etc.).
 *
 * Renders a Next.js `<Link>` styled as an inline-flex row with tracked
 * uppercase sans-serif text, a 1 px copper bottom border, and an optional
 * trailing ArrowRight icon (14 × 14 px).
 */
export function ViiCtaLink({
  href,
  children,
  showArrow = true,
  style,
  className,
}: Props) {
  return (
    <Link
      href={href}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        fontWeight: 500,
        color: "var(--vii-navy)",
        textDecoration: "none",
        borderBottom: "1px solid var(--vii-copper)",
        paddingBottom: 4,
        ...style,
      }}
    >
      {children}
      {showArrow && (
        <ArrowRight aria-hidden="true" style={{ width: 14, height: 14 }} />
      )}
    </Link>
  );
}
