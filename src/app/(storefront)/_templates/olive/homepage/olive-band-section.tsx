import Image from "next/image";

import { cn } from "~/lib/utils";

import {
  hasOliveImage,
  OliveButton,
  OliveReveal,
  OliveSectionHeading,
} from "../shared";

type Props = {
  eyebrow: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  sectionAttrs?: Record<string, string>;
  eyebrowFieldKey?: string;
  headingFieldKey?: string;
  bodyFieldKey?: string;
  ctaLabelFieldKey?: string;
};

/**
 * The Edit — the one place the olive accent runs as a field.
 *
 * A full-bleed split: a moss panel (≈ a third) carrying the eyebrow, a Bodoni
 * heading, an optional line and an ivory-filled button, beside one tall
 * photograph that bleeds to the right edge of the viewport. The panel's copy
 * starts on the page container's left edge, so it lines up with every
 * section above and below it.
 *
 * Phone and tablet: the photograph first, then the panel. With no photograph
 * the panel simply spans the width — the pitch still stands on its own.
 * `data-olive-tone="moss"` flips the scoped type, buttons and focus ring to
 * their on-dark values (ivory on moss 6.09:1).
 */
export function OliveBandSection({
  eyebrow,
  heading,
  body,
  ctaLabel,
  ctaHref,
  image,
  sectionAttrs,
  eyebrowFieldKey,
  headingFieldKey,
  bodyFieldKey,
  ctaLabelFieldKey,
}: Props) {
  if (!heading.trim() && !body.trim()) return null;

  const hasImage = hasOliveImage(image);
  const showButton = ctaLabel.trim().length > 0 && ctaHref.trim().length > 0;

  return (
    <section
      data-olive-tone="moss"
      aria-labelledby="olive-band-heading"
      className={cn("olive-band", hasImage && "olive-band-split")}
      {...sectionAttrs}
    >
      {hasImage ? (
        <div className="olive-band-media">
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 1023px) 100vw, 68vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="olive-band-panel">
        <OliveReveal className="flex flex-col items-start gap-8">
          <OliveSectionHeading
            heading={heading}
            id="olive-band-heading"
            eyebrow={eyebrow}
            eyebrowField={eyebrowFieldKey}
            body={body.trim() ? body : undefined}
            tone="invert"
            headingFieldKey={headingFieldKey}
            bodyFieldKey={bodyFieldKey}
          />

          {showButton ? (
            <OliveButton
              variant="ivory"
              arrow
              href={ctaHref}
              data-sp-field={ctaLabelFieldKey}
            >
              {ctaLabel}
            </OliveButton>
          ) : null}
        </OliveReveal>
      </div>
    </section>
  );
}
