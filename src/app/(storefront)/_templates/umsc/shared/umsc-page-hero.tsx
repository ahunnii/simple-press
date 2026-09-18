import Image from "next/image";

import { UmscHeading } from "./umsc-heading";
import { hasCustomImage } from "./umsc-image-fallback";
import { UmscLede } from "./umsc-lede";

type Props = {
  heading: string;
  headingFieldKey?: string;
  lede?: string;
  ledeFieldKey?: string;
  image?: string;
  imageAlt?: string;
  sectionAttrs?: Record<string, string>;
};

/**
 * UmscPageHero — the interior-page black band: h1 + lede, optional right-side
 * image, gold hairline along the bottom edge. Used by every non-homepage page
 * hero (About, Shop, Contact, FAQ, ...).
 */
export function UmscPageHero({
  heading,
  headingFieldKey,
  lede,
  ledeFieldKey,
  image,
  imageAlt,
  sectionAttrs,
}: Props) {
  const showImage = hasCustomImage(image);

  return (
    <section
      aria-label="Page introduction"
      {...sectionAttrs}
      className="umsc-page-hero relative border-b-2 border-[var(--umsc-gold)] bg-[var(--umsc-black)]"
    >
      <div
        className={`mx-auto grid items-center gap-10 px-6 py-16 sm:px-8 lg:py-24 ${showImage ? "lg:grid-cols-[1.1fr_0.9fr]" : ""}`}
        style={{ maxWidth: "var(--umsc-container)" }}
      >
        <div>
          <UmscHeading
            as="h1"
            fieldKey={headingFieldKey}
            className="text-[var(--umsc-cream-on-black)]"
          >
            {heading}
          </UmscHeading>
          {lede && (
            <UmscLede onBlack fieldKey={ledeFieldKey} className="mt-5">
              {lede}
            </UmscLede>
          )}
        </div>
        {showImage && (
          <div className="relative hidden aspect-[4/3] w-full overflow-hidden border border-[var(--umsc-line-gold)] lg:block">
            <Image
              src={image!}
              alt={imageAlt ?? ""}
              fill
              className="object-cover"
              sizes="40vw"
            />
          </div>
        )}
      </div>
    </section>
  );
}
