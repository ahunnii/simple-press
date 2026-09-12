import Image from "next/image";

import { fieldAttr } from "~/lib/preview/section-attrs";

import { hasOliveImage, OliveSection, OliveSectionHeading } from "../shared";

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
 * design.md: "cover image (optional; photo band with white card title when
 * set, slate band when blank)". With a cover image it's a full-bleed photo
 * band with the heading printed on a white card pinned bottom-left (the same
 * card language as `OliveImageTile`); without one it's a quiet
 * `OliveSection tone="slate"` band, which already carries ink type per the
 * measured tone pair.
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
      <OliveSection tone="slate">
        <OliveSectionHeading
          tone="slate"
          as="h1"
          heading={heading}
          body={subtitle}
          headingFieldKey={headingFieldKey}
          bodyFieldKey={subtitleFieldKey}
        />
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
      <div className="absolute inset-0 flex items-end p-4 sm:p-8">
        <div className="olive-card flex max-w-[min(34rem,90%)] flex-col gap-2 p-6">
          <h1 className="olive-h1" {...fieldAttr(headingFieldKey)}>
            {heading}
          </h1>
          {subtitle ? (
            <p
              className="olive-caption"
              {...fieldAttr(subtitleFieldKey)}
              style={{ maxWidth: "48ch" }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
