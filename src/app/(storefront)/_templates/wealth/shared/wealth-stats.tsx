import { cn } from "~/lib/utils";

type WealthStatProps = {
  /** The numeral as the owner typed it ("$1.4M", "26", "150+"). */
  value: React.ReactNode;
  caption?: React.ReactNode;
  as?: "li" | "div";
  /** Editor wiring: spread `fieldAttr(...)` on the numeral / caption. */
  valueProps?: Record<string, string>;
  captionProps?: Record<string, string>;
  className?: string;
  /** Extra content under the caption (rare). */
  children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">;

/**
 * One big-number stat: Jost numeral (clamp 56–96px, `--wealth-ctx-num`) +
 * italic PT Sans caption (`--wealth-ctx-fg-soft`). Colors follow the
 * surrounding `.wealth-on-*` block. Extra attributes (e.g.
 * `listItemAttr(key, i)`, reveal classes) land on the root.
 */
export function WealthStat({
  value,
  caption,
  as: Tag = "li",
  valueProps,
  captionProps,
  className,
  children,
  ...rest
}: WealthStatProps) {
  return (
    <Tag {...rest} className={cn("wealth-stat", className)}>
      <span {...valueProps} className="wealth-stat__num">
        {value}
      </span>
      <span className="wealth-stat__body">
        {caption ? (
          <span {...captionProps} className="wealth-stat__cap">
            {caption}
          </span>
        ) : null}
        {children}
      </span>
    </Tag>
  );
}

export type WealthStatItem = {
  key?: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  /** Spread on the row's root (e.g. `listItemAttr(fieldKey, i)`). */
  attrs?: Record<string, string>;
};

type WealthStatsProps = {
  /** `stack` = hairline-divided list (default) · `rows` = numeral column
   *  aligned across rows with the caption beside (≥640px) · `grid` = impact
   *  grid, 1 / 2 / `cols` columns. */
  variant?: "stack" | "rows" | "grid";
  /** Desktop (≥1100px) column count for `grid`. Default 3. */
  cols?: number;
  /** Render rows from data… */
  items?: WealthStatItem[];
  /** …or pass `<WealthStat>` children directly. */
  children?: React.ReactNode;
  className?: string;
  "aria-label"?: string;
};

/** List of `WealthStat`s (`<ul class="wealth-stats">`). Renders nothing
 *  when given neither items nor children. */
export function WealthStats({
  variant = "stack",
  cols,
  items,
  children,
  className,
  "aria-label": ariaLabel,
}: WealthStatsProps) {
  if (!children && !items?.length) return null;
  return (
    <ul
      aria-label={ariaLabel}
      className={cn(
        "wealth-stats",
        variant !== "stack" && `wealth-stats--${variant}`,
        className,
      )}
      style={
        variant === "grid" && cols
          ? ({ "--wealth-stat-cols": cols } as React.CSSProperties)
          : undefined
      }
    >
      {items?.map((item, i) => (
        <WealthStat
          key={item.key ?? i}
          value={item.value}
          caption={item.caption}
          {...item.attrs}
        />
      ))}
      {children}
    </ul>
  );
}
