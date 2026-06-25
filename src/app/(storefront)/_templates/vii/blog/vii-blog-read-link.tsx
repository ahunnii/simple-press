"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Props = {
  children: ReactNode;
  /** "light" = on cream/paper sections; "dark" = on navy sections. Default "light". */
  tone?: "light" | "dark";
  /** "span" (default) renders an aria-hidden span for use inside a parent <Link>; "link" renders a next/link. */
  as?: "span" | "link";
  /** Required when as="link". */
  href?: string;
};

export function ViiBlogReadLink({
  children,
  tone = "light",
  as = "span",
  href,
}: Props) {
  const baseStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "var(--font-sans)",
    fontSize: 12,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    fontWeight: 500,
    paddingBottom: 3,
    textDecoration: "none",
    ...(tone === "dark"
      ? {
          color: "var(--vii-paper)",
          borderBottom: "1px solid var(--vii-copper-light)",
        }
      : {
          color: "var(--vii-navy)",
          borderBottom: "1px solid var(--vii-copper)",
        }),
  };

  const icon = (
    <ArrowRight aria-hidden="true" style={{ width: 13, height: 13 }} />
  );

  if (as === "link") {
    return (
      <Link href={href ?? "/"} style={baseStyle}>
        {children}
        {icon}
      </Link>
    );
  }

  return (
    <span aria-hidden="true" style={baseStyle}>
      {children}
      {icon}
    </span>
  );
}
