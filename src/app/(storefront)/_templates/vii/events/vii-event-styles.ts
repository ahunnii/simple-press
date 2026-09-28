import type { CSSProperties } from "react";

/** Copper-underline text link (the `ViiCtaLink` look) for external `<a>`s. */
export const VII_EVENT_LINK_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 24,
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--vii-navy)",
  textDecoration: "none",
  borderBottom: "1px solid var(--vii-copper)",
  paddingBottom: 4,
};

export const VII_EVENT_PRICE_STYLE: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--vii-navy)",
};
