import { cn } from "~/lib/utils";

export type WealthTone = "forest" | "primary" | "sage" | "surface" | "paper";

/** The `.wealth-on-*` context class for a tone. */
export function wealthToneClass(tone: WealthTone): string {
  return `wealth-on-${tone}`;
}

type WealthBlockProps = {
  children: React.ReactNode;
  /** Color-block context (design.md): re-points fg / heading / eyebrow /
   *  link / rule / numeral / focus colors for everything inside. */
  tone?: WealthTone;
  as?: "section" | "div" | "aside" | "article";
  /** Vertical rhythm: `default` = --wealth-section-y (64 / ~89 / 102px),
   *  `tight` = 60% of that, `flush-top` / `flush-bottom` drop one side,
   *  `none` = no padding (full-bleed compositions). */
  spacing?: "default" | "tight" | "flush-top" | "flush-bottom" | "none";
  /** Inner `.wealth-container` width; `false` renders children directly. */
  container?: "default" | "narrow" | "prose" | false;
  className?: string;
  /** Class for the inner container element. */
  containerClassName?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">;

/**
 * Redesign section wrapper: a full-width color block (`.wealth-section` +
 * `.wealth-on-<tone>`) with the redesign section spacing and an optional
 * centered `.wealth-container`. Extra attributes (`aria-labelledby`, `id`,
 * the editor's `sectionGroupAttr(...)` spread) land on the root element.
 * Server component — wrap children in `WealthReveal` for scroll reveals.
 */
export function WealthBlock({
  children,
  tone = "paper",
  as: Tag = "section",
  spacing = "default",
  container = "default",
  className,
  containerClassName,
  ...rest
}: WealthBlockProps) {
  return (
    <Tag
      {...rest}
      className={cn(
        spacing !== "none" && "wealth-section",
        spacing === "tight" && "wealth-section--tight",
        spacing === "flush-top" && "wealth-section--flush-top",
        spacing === "flush-bottom" && "wealth-section--flush-bottom",
        wealthToneClass(tone),
        className,
      )}
    >
      {container === false ? (
        children
      ) : (
        <div
          className={cn(
            "wealth-container",
            container === "narrow" && "wealth-container--narrow",
            container === "prose" && "wealth-container--prose",
            containerClassName,
          )}
        >
          {children}
        </div>
      )}
    </Tag>
  );
}
