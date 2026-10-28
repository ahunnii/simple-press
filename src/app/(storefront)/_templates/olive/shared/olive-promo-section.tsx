import Image from "next/image";

import type { OliveSectionTone } from "./olive-section";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { OliveButton } from "./olive-button";
import { hasOliveImage } from "./olive-image-fallback";
import { OliveReveal } from "./olive-reveal";
import { OliveSection } from "./olive-section";

/**
 * Grounds the card look may sit on. Light grounds only — the card prints
 * espresso type. Legacy names (`paper`, `sage-tint`, `white`) are still
 * accepted and map to sand / sand / ivory.
 */
export type OlivePromoTone = Extract<
  OliveSectionTone,
  "ivory" | "sand" | "paper" | "sage-tint" | "white"
>;

type Props = {
  /** From the boolean template field (`=== "true"`). Only takes effect with a real photo. */
  takeover: boolean;
  image: string;
  /** Small tracked caps above the heading ("THE COLLECTION"). Hidden when empty. */
  eyebrow?: string;
  heading: string;
  body: string;
  buttonLabel: string;
  buttonLink: string;
  /** Ground for the card look. Defaults to "sand". */
  tone?: OlivePromoTone;
  /** Unique per page (e.g. "olive-promo-homepage"); the h2 id used by aria-labelledby. */
  id: string;
  sectionAttrs?: Record<string, string>;
  eyebrowField?: string;
  headingFieldKey?: string;
  bodyFieldKey?: string;
  buttonLabelFieldKey?: string;
};

/**
 * OlivePromoSection — the collection takeover, in two sizes.
 *
 * Takeover: the photograph becomes the section, edge to edge, under a
 * left-weighted espresso scrim (`--olive-scrim`), and the copy prints
 * straight onto it — eyebrow, Bodoni h2, body, an `ivory` button with an
 * arrow. No card. Ivory on the scrim's darkest third measures ≥ 7:1 at the
 * copy's position; the scrim is what makes the pairing safe whatever the
 * owner uploads.
 *
 * Card: a square photograph beside the copy on a light ground with a `solid`
 * button. With no photo the copy centres itself into a clean band, because
 * an owner who wrote a pitch but has no picture yet deserves the pitch, not
 * the hole where a picture would go.
 *
 * A takeover needs a photograph: `takeover` is honoured only when `image` is
 * a real, owner-supplied file; otherwise the card look renders. The whole
 * section disappears when the heading and the body are both blank.
 */
export function OlivePromoSection({
  takeover,
  image,
  eyebrow,
  heading,
  body,
  buttonLabel,
  buttonLink,
  tone = "sand",
  id,
  sectionAttrs,
  eyebrowField,
  headingFieldKey,
  bodyFieldKey,
  buttonLabelFieldKey,
}: Props) {
  const hasHeading = heading.trim().length > 0;
  const hasBody = body.trim().length > 0;
  if (!hasHeading && !hasBody) return null;

  const showButton =
    buttonLabel.trim().length > 0 && buttonLink.trim().length > 0;
  const hasEyebrow = (eyebrow ?? "").trim().length > 0;
  const hasImage = hasOliveImage(image);
  const isTakeover = takeover && hasImage;

  const labelAttrs = hasHeading
    ? { "aria-labelledby": id }
    : { "aria-label": "Promotion" };

  const eyebrowEl = hasEyebrow ? (
    <p
      className="olive-eyebrow"
      {...(eyebrowField ? fieldAttr(eyebrowField) : {})}
    >
      {eyebrow}
    </p>
  ) : null;

  const headingEl = hasHeading ? (
    <h2
      id={id}
      className="olive-h2"
      {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
    >
      {heading}
    </h2>
  ) : null;

  if (isTakeover) {
    return (
      <OliveSection
        bleed
        tone="espresso"
        style={{ paddingBlock: 0, paddingInline: 0 }}
        innerStyle={{ maxWidth: "none" }}
        innerClassName="relative"
        {...labelAttrs}
        {...sectionAttrs}
      >
        <div className="relative flex min-h-[clamp(28rem,78vh,44rem)] w-full items-center overflow-hidden">
          <Image
            src={image}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          <span
            aria-hidden="true"
            className="olive-photo-scrim pointer-events-none absolute inset-0"
          />

          <div
            className="relative mx-auto w-full py-16"
            style={{
              maxWidth: "var(--olive-container)",
              paddingInline: "var(--olive-section-pad-x)",
            }}
          >
            <OliveReveal className="olive-on-photo flex max-w-[34rem] flex-col items-start gap-5">
              {eyebrowEl}
              {headingEl}
              {hasBody ? (
                <p
                  className="max-w-[44ch] text-[0.9375rem] leading-[1.7]"
                  style={{ color: "var(--olive-on-dark)" }}
                  {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
                >
                  {body}
                </p>
              ) : null}
              {showButton ? (
                <OliveButton
                  variant="ivory"
                  arrow
                  href={buttonLink}
                  className="mt-2"
                  data-sp-field={buttonLabelFieldKey}
                >
                  {buttonLabel}
                </OliveButton>
              ) : null}
            </OliveReveal>
          </div>
        </div>
      </OliveSection>
    );
  }

  const bodyEl = hasBody ? (
    <p
      className="max-w-[52ch] text-[0.9375rem] leading-[1.7]"
      style={{ color: "var(--olive-ink-soft)" }}
      {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
    >
      {body}
    </p>
  ) : null;

  const button = showButton ? (
    <OliveButton
      variant="solid"
      arrow
      href={buttonLink}
      className="mt-2"
      data-sp-field={buttonLabelFieldKey}
    >
      {buttonLabel}
    </OliveButton>
  ) : null;

  return (
    <OliveSection bleed tone={tone} {...labelAttrs} {...sectionAttrs}>
      <OliveReveal>
        {hasImage ? (
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
            <div
              className="relative overflow-hidden"
              style={{
                aspectRatio: "1 / 1",
                backgroundColor: "var(--olive-sand)",
              }}
            >
              <Image
                src={image}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            <div className="flex flex-col items-start gap-4 md:py-4">
              {eyebrowEl}
              {headingEl}
              {bodyEl}
              {button}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-[62ch] flex-col items-center gap-4 text-center">
            {eyebrowEl}
            {headingEl}
            {bodyEl}
            {button}
          </div>
        )}
      </OliveReveal>
    </OliveSection>
  );
}
