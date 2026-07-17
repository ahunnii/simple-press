type NoiseMarqueeStripProps = {
  text?: string;
  /** Spread on root <div> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

const DEFAULT_MARQUEE_TEXT =
  "Fashion that dances · Garments that fly · Considered apparel · Small batches ·";

export function NoiseMarqueeStrip({
  text,
  sectionAttrs,
}: NoiseMarqueeStripProps) {
  const raw = text && text.trim().length > 0 ? text : DEFAULT_MARQUEE_TEXT;
  const items = raw
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);

  if (items.length === 0) return null;

  // Duplicate the list so the -50% translateX loop reads seamlessly.
  const track = [...items, ...items];

  return (
    <div
      className="border-foreground/15 overflow-hidden border-y"
      style={{ background: "var(--vn-paper)" }}
      {...sectionAttrs}
    >
      <div className="vn-marquee-track py-5">
        {track.map((item, index) => (
          <span
            key={index}
            // The second copy exists only for the seamless visual loop — hide it
            // from assistive tech so screen readers don't read the list twice.
            aria-hidden={index >= items.length}
            className="font-mono whitespace-nowrap uppercase"
            style={{
              fontSize: "11px",
              letterSpacing: "0.24em",
              color: "var(--vn-steel-mist)",
              paddingInline: "28px",
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
