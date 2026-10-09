import { cn } from "~/lib/utils";

import { gloveRevealItemStyle } from "./glove-reveal-style";

type GloveMedallionProps = {
  /** The number or glyph inside the disc. */
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /**
   * Stagger index for the pop-in animation. When set, the medallion pops in
   * when its enclosing `GloveRevealGroup` enters the viewport.
   */
  popIndex?: number;
  className?: string;
};

/** Purple numbered disc (step markers, point tallies, PDP step labels). */
export function GloveMedallion({
  children,
  size = "md",
  popIndex,
  className,
}: GloveMedallionProps) {
  return (
    <span
      className={cn(
        "glove-medallion",
        size === "sm" && "glove-medallion--sm",
        size === "lg" && "glove-medallion--lg",
        popIndex !== undefined && "glove-pop",
        className,
      )}
      style={
        popIndex !== undefined ? gloveRevealItemStyle(popIndex) : undefined
      }
    >
      {children}
    </span>
  );
}
