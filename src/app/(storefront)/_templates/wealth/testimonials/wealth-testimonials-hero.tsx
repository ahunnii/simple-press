import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthLink } from "../shared/wealth-link";
import { WealthOverlapHero } from "../shared/wealth-overlap-hero";

type Props = {
  heading: string;
  intro: string;
  linkLabel: string;
  linkUrl: string;
  image: string;
  imageAlt: string;
};

/**
 * "Co-ops We Support" hero. Renders the optional overlap image via
 * `WealthOverlapHero` when configured; falls back to a plain centered
 * header when the image field is blank (design.md: hideable via empty).
 */
export function WealthTestimonialsHero({
  heading,
  intro,
  linkLabel,
  linkUrl,
  image,
  imageAlt,
}: Props) {
  const body = (
    <>
      <h1
        {...fieldAttr("wealth.testimonials.hero-heading")}
        className="wealth-h1 italic"
        style={{ fontStyle: "italic" }}
      >
        {heading}
      </h1>
      {intro ? (
        <p
          {...fieldAttr("wealth.testimonials.hero-intro")}
          className="mt-[var(--wealth-rhythm)]"
        >
          {intro}
        </p>
      ) : null}
      {linkLabel && linkUrl ? (
        <p className="mt-[var(--wealth-rhythm)]">
          <WealthLink href={linkUrl} external>
            <span {...fieldAttr("wealth.testimonials.hero-link-label")}>
              {linkLabel}
            </span>
          </WealthLink>
        </p>
      ) : null}
    </>
  );

  return (
    <section
      aria-label="Co-ops We Support"
      {...sectionGroupAttr("testimonials", "hero")}
      className="py-[calc(var(--wealth-rhythm)*2)]"
    >
      <div className="mx-auto w-full max-w-[var(--wealth-container)] px-[var(--wealth-gutter)]">
        {image ? (
          <WealthOverlapHero image={image} imageAlt={imageAlt}>
            {body}
          </WealthOverlapHero>
        ) : (
          <div className="mx-auto max-w-[720px] text-center">{body}</div>
        )}
      </div>
    </section>
  );
}
