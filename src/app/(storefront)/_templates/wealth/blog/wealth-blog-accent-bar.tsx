/**
 * The 39×3px orange underline bar that follows every blog title — card and
 * post alike (`--wealth-blog-accent`, decorative). See design.md's Blog
 * section and the ditto clone's `feature-card.tsx` `after:` rule.
 */
export function WealthBlogAccentBar({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        width: 39,
        height: 3,
        background: "var(--wealth-blog-accent)",
        ...style,
      }}
    />
  );
}
