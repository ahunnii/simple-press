"use client";

import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Text alignment of the overline within its container. */
  align?: "left" | "center";
  /** "light" = on paper/cream backgrounds; "dark" = on navy backgrounds. */
  tone?: "light" | "dark";
  /** Optional extra styles merged onto the wrapper (e.g. marginBottom). */
  style?: CSSProperties;
};

/**
 * ViiOverline — the shared Skinbar VII section kicker.
 *
 * A deliberate brand device (short copper lead-rule + tracked uppercase label)
 * used consistently across vii sections, rather than a generic per-section
 * eyebrow. Two tones for light vs. dark backgrounds.
 */
export function ViiOverline({
  children,
  align = "left",
  tone = "light",
  style,
}: Props) {
  const labelColor = tone === "dark" ? "var(--vii-tan)" : "var(--vii-ink-soft)";
  const ruleColor =
    tone === "dark" ? "var(--vii-copper-light)" : "var(--vii-copper)";

  return (
    <p
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        justifyContent: align === "center" ? "center" : "flex-start",
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: labelColor,
        margin: 0,
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 24,
          height: 1,
          background: ruleColor,
          flex: "none",
        }}
      />
      {children}
    </p>
  );
}
