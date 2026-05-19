const PRESS_ITEMS = [
  "Eastern Market Pop-Up",
  "Detroit Garment Group",
  "Vogue Italia, Talents",
  "CCS Runway, 2025",
  "Detroit Design Festival",
];

export function NoiseSignalStrip() {
  return (
    <div
      className="flex items-center gap-5 overflow-x-auto border-y border-foreground/30 px-7 py-4 no-scrollbar"
      style={{ background: "var(--vn-paper)" }}
    >
      <span className="vn-stamp flex-shrink-0 text-[9.5px]">As Heard At</span>
      <div className="flex items-center gap-8 flex-shrink-0">
        {PRESS_ITEMS.map((item, i) => (
          <span
            key={item}
            className="font-serif italic whitespace-nowrap"
            style={{ fontSize: "clamp(16px, 2.2vw, 22px)", letterSpacing: "-0.01em" }}
          >
            {item}{" "}
            <span
              className="font-mono not-italic"
              style={{ fontSize: "11px", color: "var(--vn-steel)" }}
            >
              /{String(i + 1).padStart(2, "0")}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
