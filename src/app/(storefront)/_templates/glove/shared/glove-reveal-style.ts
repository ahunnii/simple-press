import type { CSSProperties } from "react";

/** Inline style carrying the stagger index for `.glove-reveal-item` / `.glove-pop`. */
export function gloveRevealItemStyle(index: number): CSSProperties {
  return { "--i": Math.min(index, 7) } as CSSProperties;
}
