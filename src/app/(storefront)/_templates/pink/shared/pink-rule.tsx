type PinkRuleProps = {
  /** Width in px — design.md calls for 38–56px depending on context. */
  width?: number;
  tone?: "paper" | "dark";
  /** Runs the `pa-rule` scaleX entrance once `.pink-js` is armed. Default true. */
  animate?: boolean;
  className?: string;
};

/**
 * The `2px` accent rule used throughout interior headers and section
 * openers. Server-safe — the entrance animation is pure CSS, gated behind
 * `.pink-js` (progressive enhancement) and `prefers-reduced-motion`.
 */
export function PinkRule({
  width = 44,
  tone = "paper",
  animate = true,
  className,
}: PinkRuleProps) {
  return (
    <div
      aria-hidden="true"
      className={`${animate ? "pink-anim-rule" : ""}${className ? ` ${className}` : ""}`}
      style={{
        // Height is set inline, NOT via `h-[2px]`: Tailwind does not emit
        // sub-4px arbitrary height utilities here (`h-[1px]`/`h-[2px]`/`h-[3px]`
        // all resolve to nothing, while `h-[42px]` works), which silently
        // collapsed this rule to 0px everywhere it is used.
        height: 2,
        width,
        background: tone === "dark" ? "var(--pink-blush)" : "var(--pink-rose)",
      }}
    />
  );
}
