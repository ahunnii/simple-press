import Image from "next/image";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import {
  hasOliveImage,
  OliveButton,
  OliveReveal,
  OliveSection,
  OliveSectionHeading,
} from "../shared";

type Props = {
  eyebrow: string;
  heading: string;
  body: string;
  buttonLabel: string;
  buttonHref: string;
  image: string;
  sectionAttrs?: Record<string, string>;
  eyebrowFieldKey?: string;
  headingFieldKey?: string;
  bodyFieldKey?: string;
  buttonLabelFieldKey?: string;
};

/**
 * The About split — who is behind the rail, told in a few lines.
 *
 * A sand panel carrying the eyebrow ("ABOUT OLIVE MODE"), a Bodoni heading,
 * a short paragraph and the espresso `solid` button, beside one photograph
 * (≈45 / 55 on a laptop, as on the board). On a phone the copy comes first
 * and the photograph follows. With no photograph the copy centres itself on
 * the sand — the story still stands without a picture.
 *
 * The whole section disappears when the heading and the text are both blank.
 */
export function OliveStorySection({
  eyebrow,
  heading,
  body,
  buttonLabel,
  buttonHref,
  image,
  sectionAttrs,
  eyebrowFieldKey,
  headingFieldKey,
  bodyFieldKey,
  buttonLabelFieldKey,
}: Props) {
  const hasHeading = heading.trim().length > 0;
  const hasBody = body.trim().length > 0;
  if (!hasHeading && !hasBody) return null;

  const hasImage = hasOliveImage(image);
  const showButton =
    buttonLabel.trim().length > 0 && buttonHref.trim().length > 0;

  const labelAttrs = hasHeading
    ? { "aria-labelledby": "olive-story-heading" }
    : { "aria-label": "About us" };

  return (
    <OliveSection tone="ivory" {...labelAttrs} {...sectionAttrs}>
      <OliveReveal
        className={cn("olive-story", hasImage && "olive-story-split")}
      >
        <div className="olive-story-panel">
          <div
            className={cn(
              "flex flex-col gap-8",
              hasImage ? "items-start" : "items-center",
            )}
          >
            {hasHeading ? (
              <OliveSectionHeading
                heading={heading}
                id="olive-story-heading"
                eyebrow={eyebrow}
                eyebrowField={eyebrowFieldKey}
                body={hasBody ? body : undefined}
                align={hasImage ? "start" : "center"}
                headingFieldKey={headingFieldKey}
                bodyFieldKey={bodyFieldKey}
                className="olive-story-heading"
              />
            ) : (
              <p
                className="olive-body"
                {...(bodyFieldKey ? fieldAttr(bodyFieldKey) : {})}
              >
                {body}
              </p>
            )}

            {showButton ? (
              <OliveButton
                variant="solid"
                arrow
                href={buttonHref}
                data-sp-field={buttonLabelFieldKey}
              >
                {buttonLabel}
              </OliveButton>
            ) : null}
          </div>
        </div>

        {hasImage ? (
          <div className="olive-story-media">
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 1023px) 100vw, 55vw"
              className="object-cover"
            />
          </div>
        ) : null}
      </OliveReveal>
    </OliveSection>
  );
}
