import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

type Props = {
  /** Small uppercase gold label above the heading. Blank hides it. */
  eyebrow?: string;
  eyebrowFieldKey?: string;
  heading: string;
  headingFieldKey: string;
  /** Muted supporting paragraph under the gold rule. Blank hides it. */
  lede?: string;
  ledeFieldKey?: string;
  /** Which surface the heading sits on — picks the gold that stays legible. */
  tone?: "cream" | "forest";
  className?: string;
};

/**
 * The bamboo section rhythm: gold eyebrow → serif h2 → thin gold rule → muted
 * lede. This is happy-bamboo's heading block (eyebrow `span` → `font-serif`
 * `text-4xl md:text-5xl` h2 → `max-w-2xl` muted lede) with bamboo's gold rule
 * threaded in; the caps/tracking display treatment now lives only in the hero,
 * which is the one place the client mockup pins it.
 *
 * `tone="forest"` swaps the text-grade gold for `--bam-gold-soft`, which is the
 * only gold that clears contrast on the deep green surfaces.
 */
export function BambooSectionHeading({
  eyebrow,
  eyebrowFieldKey,
  heading,
  headingFieldKey,
  lede,
  ledeFieldKey,
  tone = "cream",
  className,
}: Props) {
  const onForest = tone === "forest";

  return (
    <div className={cn("text-center", className)}>
      {eyebrow ? (
        <p
          className={cn(
            // text-sm + font-semibold matches the hero kicker exactly, so every
            // gold-on-cream small caps on the page shares one contrast profile.
            "text-sm font-semibold tracking-widest uppercase",
            onForest ? "text-[var(--bam-gold-soft)]" : "text-[var(--bam-gold)]",
          )}
          {...(eyebrowFieldKey ? fieldAttr(eyebrowFieldKey) : {})}
        >
          {eyebrow}
        </p>
      ) : null}

      <h2
        className={cn(
          "mt-2 font-serif text-4xl font-bold text-balance md:text-5xl",
          onForest ? "text-[var(--bam-cream)]" : "text-foreground",
        )}
        {...fieldAttr(headingFieldKey)}
      >
        {heading}
      </h2>

      <span
        aria-hidden="true"
        className={cn(
          "mx-auto mt-5 block h-px w-16",
          onForest ? "bg-[var(--bam-gold-soft)]" : "bg-[var(--bam-gold)]",
        )}
      />

      {lede ? (
        <p
          className={cn(
            "mx-auto mt-5 max-w-2xl text-base leading-relaxed text-pretty",
            onForest ? "text-[var(--bam-cream)]/80" : "text-muted-foreground",
          )}
          {...(ledeFieldKey ? fieldAttr(ledeFieldKey) : {})}
        >
          {lede}
        </p>
      ) : null}
    </div>
  );
}
