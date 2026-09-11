import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthSection } from "../shared/wealth-section";

type Props = {
  overline: string;
  heading: string;
  body: string;
  buttonText: string;
  buttonLink: string;
};

/**
 * Closing call-to-action shown at the end of every blog post — owner
 * configurable via the shared `blog.cta` field group (field-conventions
 * "group granularity = section granularity"; this section's platform id is
 * `blog.post` per the blog-post-context convention — see blog/index.ts).
 */
export function WealthBlogPostCta({
  overline,
  heading,
  body,
  buttonText,
  buttonLink,
}: Props) {
  return (
    <WealthSection sectionAttrs={sectionGroupAttr("blog", "cta")} className="text-center">
      <div className="mx-auto" style={{ maxWidth: 560 }}>
        {/* Plain tags with the shared classes instead of `WealthEyebrow`/
            `WealthSectionHeading`: neither component forwards unknown props
            to its underlying DOM node (they destructure a closed prop list),
            so spreading `fieldAttr` onto them silently drops the
            `data-sp-field` attribute and breaks editor live-text patching.
            Visually identical — this is exactly what each component renders
            — without touching the shared components (out of this agent's
            scope; see also wealth-blog-page.tsx). */}
        <p className="wealth-eyebrow mb-3" {...fieldAttr("wealth.blog.cta-overline")}>
          {overline}
        </p>
        {/* `.wealth-section-heading` sets `margin: 0` via an unlayered rule
            (deliberately, so it beats Tailwind utilities) — a `mb-*`
            className here would be silently dropped, so spacing below is
            carried by the body paragraph's `marginTop` instead. */}
        <h2 className="wealth-section-heading" {...fieldAttr("wealth.blog.cta-heading")}>
          {heading}
        </h2>
        <p
          {...fieldAttr("wealth.blog.cta-body")}
          style={{
            fontFamily: "var(--font-wealth-body)",
            fontSize: 17,
            lineHeight: "25.5px",
            color: "var(--wealth-ink)",
            marginTop: 16,
            marginBottom: "var(--wealth-rhythm)",
          }}
        >
          {body}
        </p>
        <WealthLedgeButton href={buttonLink}>
          <span {...fieldAttr("wealth.blog.cta-button-text")}>{buttonText}</span>
        </WealthLedgeButton>
      </div>
    </WealthSection>
  );
}
