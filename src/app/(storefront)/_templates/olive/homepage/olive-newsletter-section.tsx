"use client";

import Image from "next/image";

import { useNewsletterSignup } from "~/hooks/use-newsletter-signup";

import { hasOliveImage, OliveReveal, OliveSectionHeading } from "../shared";
import { OliveNewsletterForm } from "./olive-newsletter-form";

type Props = {
  eyebrow: string;
  heading: string;
  body: string;
  buttonLabel: string;
  image: string;
  privacyHref?: string;
  sectionAttrs?: Record<string, string>;
  eyebrowFieldKey?: string;
  headingFieldKey?: string;
  bodyFieldKey?: string;
  buttonLabelFieldKey?: string;
};

const ID_PREFIX = "olive-home-newsletter";
const HEADING_ID = `${ID_PREFIX}-heading`;

/**
 * The Inner Circle — the homepage's closing band and its one sign-up.
 *
 * An espresso field (or an owner photograph under the left-weighted scrim).
 * On a laptop it is two columns on the page edge — eyebrow, Bodoni heading
 * and one line on the left; the ivory email box with its square arrow submit
 * on the right — stacked on a phone.
 * The homepage only mounts this while the store's Email marketing feature is
 * on; the hook re-checks on the client, and if the server ever answers
 * FORBIDDEN the whole band stands down rather than offering a form that
 * cannot work. No fake success, no "coming soon".
 *
 * The heading block rides a reveal; the form deliberately does not (a form
 * inside a reveal can have its submit cancelled mid-transition).
 */
export function OliveNewsletterSection({
  eyebrow,
  heading,
  body,
  buttonLabel,
  image,
  privacyHref,
  sectionAttrs,
  eyebrowFieldKey,
  headingFieldKey,
  bodyFieldKey,
  buttonLabelFieldKey,
}: Props) {
  const newsletter = useNewsletterSignup({ warm: "interaction" });
  if (!newsletter.enabled || newsletter.status === "disabled") return null;

  const hasHeading = heading.trim().length > 0;
  const hasImage = hasOliveImage(image);

  return (
    <section
      data-olive-tone="espresso"
      className="olive-newsletter"
      {...(hasHeading
        ? { "aria-labelledby": HEADING_ID }
        : { "aria-label": "Email sign-up" })}
      {...sectionAttrs}
    >
      {hasImage ? (
        <>
          <Image
            src={image}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          <span aria-hidden="true" className="olive-newsletter-scrim" />
        </>
      ) : null}

      <div
        className="olive-newsletter-inner"
        data-has-heading={hasHeading ? "true" : undefined}
      >
        {hasHeading ? (
          <OliveReveal className="olive-newsletter-copy">
            <OliveSectionHeading
              heading={heading}
              id={HEADING_ID}
              eyebrow={eyebrow}
              eyebrowField={eyebrowFieldKey}
              body={body.trim() ? body : undefined}
              tone="invert"
              headingFieldKey={headingFieldKey}
              bodyFieldKey={bodyFieldKey}
            />
          </OliveReveal>
        ) : null}

        {/* Outside the reveal on purpose (see the note above). */}
        <OliveNewsletterForm
          newsletter={newsletter}
          idPrefix={ID_PREFIX}
          headingId={hasHeading ? HEADING_ID : undefined}
          buttonLabel={buttonLabel}
          buttonLabelField={buttonLabelFieldKey}
          privacyHref={privacyHref}
        />
      </div>
    </section>
  );
}
