import { DreamH1 } from "../shared/dream-h1";
import { DreamReveal } from "../shared/dream-reveal";

type Props = {
  image: string;
  title: string;
  excerpt?: string;
};

/**
 * Full-bleed cover hero for GenericPage records with `page.image` set — a
 * photo band under a paper scrim (design.md GenericPage note: "photo band
 * with a paper scrim and the title"). Deliberately NOT wealth's dark-ink
 * gradient: `--dream-veil` is the same translucent paper token the hero and
 * `DreamPageHero` already sit their text on, so this reads as the template's
 * own soft, photographic register instead of a borrowed one.
 */
export function DreamGenericCoverHero({ image, title, excerpt }: Props) {
  return (
    <div className="relative min-h-[clamp(320px,42vw,480px)] overflow-hidden">
      <img
        src={image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, var(--dream-veil) 0%, color-mix(in srgb, var(--dream-veil) 55%, transparent) 55%, transparent 100%)",
        }}
      />
      <div className="relative flex h-full items-end">
        <div className="mx-auto w-full [max-width:var(--dream-container)] px-[var(--dream-gutter)] pt-24 pb-12 text-center sm:pb-16">
          <DreamReveal>
            <DreamH1>{title}</DreamH1>
            {excerpt ? (
              <p className="mx-auto mt-4 max-w-[60ch] text-[18px] leading-[1.7] text-[var(--dream-ink)]">
                {excerpt}
              </p>
            ) : null}
          </DreamReveal>
        </div>
      </div>
    </div>
  );
}
