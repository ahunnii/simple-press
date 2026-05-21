import { FadeIn } from "~/components/page-animations";

type NoisePhilosophySectionProps = {
  overline?: string;
  quote?: string;
};

export function NoisePhilosophySection({
  overline,
  quote,
}: NoisePhilosophySectionProps) {
  return (
    <section
      className="border-foreground/20 px-6 py-16 pt-32 text-center"
      style={{ background: "var(--vn-paper)" }}
    >
      <FadeIn className="mx-auto max-w-3xl">
        <p
          className="mb-8 font-mono text-[9.5px] tracking-[.28em] uppercase"
          style={{ color: "var(--vn-steel)" }}
        >
          {overline}
        </p>
        <p
          className="line font-serif leading-[1.25] tracking-tight whitespace-pre-line italic"
          style={{
            fontSize: "clamp(1.6rem, 3vw, 2.6rem)",
            letterSpacing: "-0.01em",
            color: "var(--vn-ink)",
          }}
        >
          {quote}
        </p>
      </FadeIn>
    </section>
  );
}
