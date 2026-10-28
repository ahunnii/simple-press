import Image from "next/image";

import { fieldAttr } from "~/lib/preview/section-attrs";

import {
  hasOliveImage,
  OliveReveal,
  OliveSection,
  OliveSectionHeading,
} from "../shared";

type Props = {
  image: string;
  heading: string;
  subtitle: string;
  headingFieldKey: string;
  subtitleFieldKey: string;
};

/**
 * OliveBlogHero — the journal index's masthead.
 *
 * With a cover image it's a full-bleed photo band with the heading printed
 * straight on the photograph, bottom-left, under an espresso scrim (the same
 * copy-on-photo language as `OliveImageTile`); without one it's an espresso
 * band carrying ivory Bodoni type.
 *
 * No `data-sp-group` hotspot here — the parent (`OliveBlogPage`) puts one
 * wrapping root around this component AND the search/grid/empty-state area
 * below it, since both render the same `blog.hero` field group and the
 * editor's focus/pulse looks up a group's hotspot with `querySelector`
 * (first match only, see `src/components/preview/preview-overlay.tsx`).
 */
export function OliveBlogHero({
  image,
  heading,
  subtitle,
  headingFieldKey,
  subtitleFieldKey,
}: Props) {
  if (!hasOliveImage(image)) {
    return (
      <OliveSection tone="espresso" bleed>
        <OliveReveal>
          <OliveSectionHeading
            tone="invert"
            as="h1"
            heading={heading}
            body={subtitle}
            headingFieldKey={headingFieldKey}
            bodyFieldKey={subtitleFieldKey}
          />
        </OliveReveal>
      </OliveSection>
    );
  }

  return (
    <section
      aria-label={heading || "The journal"}
      className="relative w-full overflow-hidden"
      style={{ minHeight: "clamp(320px, 42vw, 480px)" }}
    >
      <Image
        src={image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--olive-espresso) 78%, transparent), transparent 72%), var(--olive-scrim)",
        }}
      />
      <div className="olive-on-photo absolute inset-0 flex items-end p-4 sm:p-10">
        <OliveReveal className="flex max-w-[min(38rem,90%)] flex-col gap-3">
          <h1 className="olive-h1" {...fieldAttr(headingFieldKey)}>
            {heading}
          </h1>
          {subtitle ? (
            <p
              className="olive-body"
              {...fieldAttr(subtitleFieldKey)}
              style={{ maxWidth: "48ch" }}
            >
              {subtitle}
            </p>
          ) : null}
        </OliveReveal>
      </div>
    </section>
  );
}
