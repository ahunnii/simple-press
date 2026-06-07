import { FadeIn } from "~/components/page-animations";

type NoisePhilosophySectionProps = {
  overline?: string;
  quote?: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function NoisePhilosophySection({
  overline,
  quote,
  sectionAttrs,
}: NoisePhilosophySectionProps) {
  return (
    <section
      className="border-foreground/20 bg-[var(--sl-cream)] px-6 py-16 pt-32 text-center"
      {...sectionAttrs}
    >
      <FadeIn className="mx-auto max-w-3xl">
        <p className="mb-8 font-mono text-[9.5px] tracking-[.28em] text-[var(--sl-green)] uppercase">
          {overline}
        </p>
        <p className="line font-serif text-[clamp(1.6rem,3vw,2.6rem)] leading-[1.25] tracking-[-0.01em] whitespace-pre-line text-[var(--sl-ink)] italic">
          {quote}
        </p>
      </FadeIn>
    </section>
  );
}
