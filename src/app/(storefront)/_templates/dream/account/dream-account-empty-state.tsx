import { DreamButton } from "../shared/dream-button";
import { DreamReveal } from "../shared/dream-reveal";

type Props = {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

/**
 * Shared warm empty state for Orders/Subscriptions: the business's mark on
 * a tinted sky badge (not a lucide icon — design.md's account note says
 * "mark", and the mark is Selest's own logo, not a generic glyph), a short
 * message, and a `DreamButton` back into the funnel.
 */
export function DreamAccountEmptyState({
  heading,
  body,
  ctaLabel,
  ctaHref,
}: Props) {
  return (
    <DreamReveal>
      <div className="flex flex-col items-center gap-5 py-20 text-center">
        <div
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background:
              "linear-gradient(180deg, var(--dream-sky) 0%, var(--dream-sky-deep) 100%)",
          }}
        >
          <img
            src="/templates/dream/images/logo.webp"
            alt=""
            className="h-7 w-7 object-contain opacity-40"
            draggable={false}
          />
        </div>
        <h2 className="m-0 [font-family:var(--font-dream-display)] text-[24px] text-[var(--dream-ink)]">
          {heading}
        </h2>
        <p className="m-0 max-w-[38ch] text-[15px] leading-[1.7] text-[var(--dream-soft)]">
          {body}
        </p>
        <DreamButton href={ctaHref} variant="primary">
          {ctaLabel}
        </DreamButton>
      </div>
    </DreamReveal>
  );
}
