import Image from "next/image";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { OliveButton } from "./olive-button";
import { hasOliveImage } from "./olive-image-fallback";
import { OliveLeafMark } from "./olive-leaf-mark";
import { OliveReveal } from "./olive-reveal";
import { OliveSection } from "./olive-section";

/** The three grounds a promo card may sit on. `sage` is not offered: the card
 *  variant prints ink type, and ink on the sage field is not a measured pair. */
export type OlivePromoTone = "paper" | "sage-tint" | "white";

type Props = {
  /** From the boolean template field (`=== "true"`). Only takes effect with a real photo. */
  takeover: boolean;
  image: string;
  heading: string;
  body: string;
  buttonLabel: string;
  buttonLink: string;
  /** Ground for the card variant. Defaults to "sage-tint". */
  tone?: OlivePromoTone;
  /** Unique per page (e.g. "olive-promo-homepage"); the h2 id used by aria-labelledby. */
  id: string;
  sectionAttrs?: Record<string, string>;
  headingFieldKey?: string;
  bodyFieldKey?: string;
  buttonLabelFieldKey?: string;
};

/**
 * OlivePromoSection — the one cross-sell band, in two sizes.
 *
 * The card look is the everyday one: a 4:3 photograph beside a short pitch on
 * a wash, both tiles the same height so the band reads as one spread rather
 * than a card sitting on a card. The takeover look is the same band with the
 * volume up — the photograph becomes the section, edge to edge, and the copy
 * prints on a white card pinned into its bottom-left corner, the same motif
 * `OliveImageTile` uses at tile scale.
 *
 * A takeover needs a photograph. `takeover` is honoured only when `image` is a
 * real, owner-supplied file; with a blank or placeholder src there is nothing
 * to take over the page, so the card look renders instead. And in the card
 * look a missing photo does not draw a grey stand-in either: the copy simply
 * centres itself into a clean band, because an owner who wrote a pitch but has
 * no picture yet deserves the pitch, not the hole where a picture would go.
 *
 * There is no scrim, and there never will be. White type over a photograph is
 * a contrast gamble the owner's own uploads decide; the template's answer is
 * to print on the photograph instead — copy sits on white card stock, the
 * photo stays unclouded, and the pairing is measured whatever the picture is.
 *
 * The whole section disappears when the heading and the body are both blank.
 */
export function OlivePromoSection({
  takeover,
  image,
  heading,
  body,
  buttonLabel,
  buttonLink,
  tone = "sage-tint",
  id,
  sectionAttrs,
  headingFieldKey,
  bodyFieldKey,
  buttonLabelFieldKey,
}: Props) {
  const hasHeading = heading.trim().length > 0;
  const hasBody = body.trim().length > 0;
  if (!hasHeading && !hasBody) return null;

  const showButton =
    buttonLabel.trim().length > 0 && buttonLink.trim().length > 0;
  const hasImage = hasOliveImage(image);
  const isTakeover = takeover && hasImage;

  const labelAttrs = hasHeading
    ? { "aria-labelledby": id }
    : { "aria-label": "Promotion" };

  const leaf = (
    <span aria-hidden="true" style={{ color: "var(--olive-leaf)" }}>
      <OliveLeafMark size={20} />
    </span>
  );

  const button = showButton ? (
    <OliveButton
      variant="primary"
      href={buttonLink}
      className="self-start"
      data-sp-field={buttonLabelFieldKey}
    >
      {buttonLabel}
    </OliveButton>
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
        tone="white"
        style={{ paddingBlock: 0, paddingInline: 0 }}
        innerStyle={{ maxWidth: "none" }}
        innerClassName="relative pb-8 md:pb-0"
        {...labelAttrs}
        {...sectionAttrs}
      >
        <div className="relative aspect-[4/5] w-full overflow-hidden md:aspect-auto md:min-h-[clamp(26rem,64vh,40rem)]">
          <Image
            src={image}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>

        {/* On a phone the card sits in flow under the photo and only laps its
            bottom edge, so at least half the picture stays uncovered; from
            `md` up it pins into the bottom-left corner like the tile label. */}
        <OliveReveal className="olive-card relative mx-[var(--olive-section-pad-x)] -mt-16 flex flex-col gap-3 p-6 sm:p-8 md:absolute md:bottom-[clamp(1rem,4vw,2.5rem)] md:left-[var(--olive-section-pad-x)] md:mx-0 md:mt-0 md:max-w-[min(34rem,calc(100%_-_2_*_var(--olive-section-pad-x)))]">
          {leaf}
          {headingEl}
          {hasBody ? (
            <p
              className="max-w-[46ch] text-[0.9375rem] leading-relaxed"
              style={{ color: "var(--olive-ink-soft)" }}
              {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
            >
              {body}
            </p>
          ) : null}
          {button}
        </OliveReveal>
      </OliveSection>
    );
  }

  const bodyEl = hasBody ? (
    <p
      className="max-w-[52ch] text-[0.9375rem] leading-relaxed"
      style={{ color: "var(--olive-ink)" }}
      {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
    >
      {body}
    </p>
  ) : null;

  return (
    <OliveSection bleed tone={tone} {...labelAttrs} {...sectionAttrs}>
      <OliveReveal>
        {hasImage ? (
          <div className="grid items-stretch gap-6 md:grid-cols-2 md:gap-10">
            <div
              className="relative overflow-hidden"
              style={{
                aspectRatio: "4 / 3",
                borderRadius: "var(--olive-card-radius)",
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

            <div className="flex flex-col justify-center gap-4 md:py-4">
              {headingEl}
              {bodyEl}
              {button}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-[62ch] flex-col items-center gap-4 text-center">
            {headingEl}
            {bodyEl}
            {showButton ? (
              <OliveButton
                variant="primary"
                href={buttonLink}
                data-sp-field={buttonLabelFieldKey}
              >
                {buttonLabel}
              </OliveButton>
            ) : null}
          </div>
        )}
      </OliveReveal>
    </OliveSection>
  );
}
