import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";

type Props = {
  href: string;
  children: ReactNode;
  /** Show the trailing ArrowRight icon. Default true. */
  showArrow?: boolean;
  style?: CSSProperties;
  className?: string;
  /**
   * Full template field key for the resolved text passed as `children`.
   * When set, spreads `data-sp-field` onto the link so the preview overlay
   * can live-patch this text.
   */
  fieldKey?: string;
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
  fieldKey,
}: Props) {
  return (
    <Link
      href={href}
      className={className}
      {...(fieldKey ? fieldAttr(fieldKey) : {})}
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
