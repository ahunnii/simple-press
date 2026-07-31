"use client";

import { usePinkReveal } from "../hooks/use-pink-reveal";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Stagger index — each unit adds a 70ms delay once the node is in view. */
  index?: number;
  /** Element tag to render — defaults to "div". */
  as?: "div" | "section" | "article" | "li";
};

/**
 * Thin client wrapper around `usePinkReveal` so server components can opt
 * into the scroll-reveal system by wrapping already-rendered children
 * without becoming `"use client"` themselves (mirrors
 * `vii/shared/vii-reveal.tsx`).
 *
 * Renders `pink-reveal` (+ `pink-revealed` once visible) — the transition
 * itself lives in the `.pink-js .pink-reveal[.pink-revealed]` rules in
 * globals.css and is a no-op until `.pink-js` is armed.
 */
export function PinkReveal({ children, className, style, index = 0, as = "div" }: Props) {
  const { ref, revealed } = usePinkReveal(index);
  const Tag = as;
  return (
    <Tag
      ref={ref as never}
      className={`pink-reveal${revealed ? " pink-revealed" : ""}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {children}
    </Tag>
  );
}
