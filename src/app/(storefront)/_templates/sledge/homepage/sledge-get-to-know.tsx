import Image from "next/image";
import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";

type SledgeGetToKnowProps = {
  heading?: string;
  body?: string;
  image?: string;
  button1Text?: string;
  button1Href?: string;
  button2Text?: string;
  button2Href?: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function SledgeGetToKnow({
  heading,
  body,
  image,
  button1Text,
  button1Href,
  button2Text,
  button2Href,
  sectionAttrs,
}: SledgeGetToKnowProps) {
  return (
    <section className="sl-section-green" {...sectionAttrs}>
      <div className="sl-container grid grid-cols-1 items-center gap-12 md:grid-cols-2">
        {/* Left: product image */}
        {image ? (
          <div className="sl-media-frame sl-media-frame-dark">
            <Image
              src={image}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        ) : (
          <div className="sl-media-frame sl-media-frame-muted" />
        )}

        {/* Right: text */}
        <div>
          <h2
            className="sl-heading-xl font-heading"
            {...fieldAttr("sledge.homepage.get-to-know-overline")}
          >
            {heading ?? "Get to Know Judy"}
          </h2>

          {/* Red-bar body text */}
          {body?.trim() ? (
            <div className="mb-10">
              <p
                className="sl-quote-body font-sans italic"
                {...fieldAttr("sledge.homepage.get-to-know-quote")}
              >
                {body}
              </p>
            </div>
          ) : null}

          {/* Coral buttons */}
          {
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- blank (not just nullish) text hides a button
            (button1Text?.trim() || button2Text?.trim()) && (
              <div className="flex flex-wrap gap-4">
                {button1Text?.trim() ? (
                  <Link
                    href={
                      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- url field: "" means unsafe/cleared, must still fall back
                      button1Href || "/about"
                    }
                    className="sl-btn"
                    {...fieldAttr("sledge.homepage.get-to-know-button-1-text")}
                  >
                    {button1Text}
                  </Link>
                ) : null}
                {button2Text?.trim() ? (
                  <Link
                    href={
                      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- url field: "" means unsafe/cleared, must still fall back
                      button2Href || "/contact"
                    }
                    className="sl-btn"
                    {...fieldAttr("sledge.homepage.get-to-know-button-2-text")}
                  >
                    {button2Text}
                  </Link>
                ) : null}
              </div>
            )
          }
        </div>
      </div>
    </section>
  );
}
