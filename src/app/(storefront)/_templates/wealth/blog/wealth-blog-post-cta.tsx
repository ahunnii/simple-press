import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthCtaBand } from "../shared/wealth-cta-band";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthReveal } from "../shared/wealth-reveal";

type Props = {
  overline: string;
  heading: string;
  body: string;
  buttonText: string;
  /** "" hides the button (the link points at a switched-off feature). */
  buttonLink: string;
};

/**
 * Closing call-to-action at the end of every blog post: a forest CTA band
 * fed by the `blog.post` field group (section id == group id ==
 * `data-sp-group`). The page gates it on the `cta-enabled` toggle AND the
 * section's visibility switch.
 */
export function WealthBlogPostCta({
  overline,
  heading,
  body,
  buttonText,
  buttonLink,
}: Props) {
  return (
    <WealthReveal>
      <WealthCtaBand
        className="wealth-blog-cta"
        aria-labelledby="wealth-blog-cta-heading"
        headingId="wealth-blog-cta-heading"
        eyebrow={overline || undefined}
        eyebrowProps={fieldAttr("wealth.blog.cta-overline")}
        heading={heading}
        headingProps={fieldAttr("wealth.blog.cta-heading")}
        body={body || undefined}
        bodyProps={fieldAttr("wealth.blog.cta-body")}
        action={
          buttonText && buttonLink ? (
            <WealthLedgeButton onDark href={buttonLink}>
              <span {...fieldAttr("wealth.blog.cta-button-text")}>
                {buttonText}
              </span>
            </WealthLedgeButton>
          ) : undefined
        }
        {...sectionGroupAttr("blog", "post")}
      />
    </WealthReveal>
  );
}
