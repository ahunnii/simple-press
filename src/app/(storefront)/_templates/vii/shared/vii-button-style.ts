import type { CSSProperties } from "react";

/**
 * vii's filled button — the copper-deep, paper-text, tracked-uppercase pill
 * the cart, checkout and order confirmation already use (there as local
 * inline styles). Pair it with `className="vii-cta-btn"` for the hover
 * sheen (globals.css; reduced-motion safe). No JS hover handlers, so it works
 * in server components.
 */
export const VII_BUTTON_STYLE: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  minHeight: 44,
  padding: "14px 32px",
  background: "var(--vii-copper-deep)",
  color: "var(--vii-paper)",
  border: "none",
  borderRadius: "var(--radius)",
  fontFamily: "var(--font-sans)",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  textDecoration: "none",
  cursor: "pointer",
};

/**
 * vii's outline button — same shape, navy hairline and navy text on a light
 * surface. Used for secondary actions (e.g. "Open Venmo").
 */
export const VII_BUTTON_OUTLINE_STYLE: CSSProperties = {
  ...VII_BUTTON_STYLE,
  background: "transparent",
  color: "var(--vii-navy)",
  border: "1px solid var(--vii-navy)",
  padding: "12px 28px",
};
