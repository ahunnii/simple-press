type NoiseEditorialStripProps = {
  marqueeText?: string;
};

export function NoiseEditorialStrip({ marqueeText }: NoiseEditorialStripProps) {
  const text =
    marqueeText ??
    "Fashion that dances · Garments that fly · Haute Couture · Detroit · Visual Noise ·";

  // Duplicate text enough to fill seamlessly
  const repeated = `${text}   ${text}   ${text}   ${text}   `;

  return (
    <div className="overflow-hidden border-y border-foreground/10 bg-foreground py-3">
      <style>{`
        @keyframes noise-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .noise-marquee-track {
          display: flex;
          width: max-content;
          animation: noise-marquee 24s linear infinite;
          will-change: transform;
        }
        .noise-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div
        className="noise-marquee-track"
        aria-hidden="true"
      >
        <span className="whitespace-nowrap font-serif italic text-sm text-background/60 px-4">
          {repeated}
        </span>
        <span className="whitespace-nowrap font-serif italic text-sm text-background/60 px-4">
          {repeated}
        </span>
      </div>
    </div>
  );
}
