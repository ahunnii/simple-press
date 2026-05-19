type NoiseEditorialStripProps = {
  marqueeText?: string;
};

export function NoiseEditorialStrip({ marqueeText }: NoiseEditorialStripProps) {
  const text =
    marqueeText ??
    "Because fashion shouldn't be quiet · Haute Couture · Detroit · Visual Noise ·";

  const repeated = `${text}   ${text}   ${text}   ${text}   `;

  return (
    <div
      className="overflow-hidden border-y-2 border-foreground py-4"
      style={{ background: "var(--vn-ink)" }}
    >
      <div
        className="vn-marquee-track"
        aria-hidden="true"
      >
        <span
          className="whitespace-nowrap font-serif italic px-6"
          style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)", color: "var(--vn-bone)", opacity: 0.85, letterSpacing: "-0.01em" }}
        >
          {repeated}
        </span>
        <span
          className="whitespace-nowrap font-serif italic px-6"
          style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)", color: "var(--vn-bone)", opacity: 0.85, letterSpacing: "-0.01em" }}
        >
          {repeated}
        </span>
      </div>
    </div>
  );
}
