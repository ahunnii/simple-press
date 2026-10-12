import Image from "next/image";

import type { ImpactLogo, ImpactThanksColumn } from "./impact-rows";
import type { ImpactFields } from "./wealth-impact-head";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { WealthReveal } from "../shared/wealth-reveal";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { ImpactFramedPhoto } from "./wealth-impact-devices";
import { anchorProps, ImpactSectionHead, val } from "./wealth-impact-head";
import { isImpactExternalUrl } from "./wealth-impact-portfolio";

export const IMPACT_THANKS_ID = "thanks";

/** The section renders when name columns OR logos exist. */
export function hasImpactThanks({
  columns,
  logos,
}: {
  columns: ImpactThanksColumn[];
  logos: ImpactLogo[];
}): boolean {
  return columns.length > 0 || logos.length > 0;
}

/**
 * Accessible name for a logo cell. The owner's `name` wins; a linked logo
 * with no name falls back to the link's host ("example.org") or path, so it is
 * never announced as empty. An unlinked, unnamed logo is decorative ("").
 */
export function impactLogoLabel(name: string, url: string): string {
  if (name) return name;
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    // An on-site link ("/about"): the path is the best name there is.
    return url.replace(/^\/+/, "");
  }
}

/**
 * 14 · Thank you: paper. The head sits beside a framed full-colour group
 * photo (`thanks-image`) when set, then today's name columns, the italic
 * closing line, and the logo wall: 3:2 white cells with hairline borders and
 * the logo contained (5 across on desktop, 3 on tablet, 2 on phones). A cell
 * is a link (↗) when the logo row has a URL, else a plain figure.
 */
export function WealthImpactThanks({
  f,
  columns,
  logos = [],
  number,
}: {
  f: ImpactFields;
  columns: ImpactThanksColumn[];
  /** `parseImpactLogos` output, URLs already route-checked. */
  logos?: ImpactLogo[];
  /** Render-order section number (cover = 1). */
  number?: number;
}) {
  const id = IMPACT_THANKS_ID;
  const heading = val(f, K.thanksHeading);
  const closing = val(f, K.thanksClosing);
  const image = val(f, K.thanksImage);
  return (
    <section
      {...sectionGroupAttr("impact", "thanks")}
      {...anchorProps(id, heading)}
      className="wealth-section wealth-on-paper wealth-impact-anchor"
    >
      <div className="wealth-container">
        <div
          className={cn(
            "wealth-impact-thankshead",
            image && "wealth-impact-thankshead--photo",
          )}
        >
          <ImpactSectionHead
            sectionId={id}
            number={number}
            headingSize="xl"
            eyebrow={val(f, K.thanksEyebrow)}
            eyebrowKey={K.thanksEyebrow}
            heading={heading}
            headingKey={K.thanksHeading}
          />
          {image ? (
            <WealthReveal
              delay={1}
              threshold={0}
              className="wealth-impact-thankshead__media"
            >
              <ImpactFramedPhoto
                src={image}
                alt={val(f, K.thanksImageAlt)}
                aspect="752 / 629"
                sizes="(min-width: 900px) 600px, 100vw"
              />
            </WealthReveal>
          ) : null}
        </div>
        {columns.length > 0 ? (
          <WealthReveal
            threshold={0}
            className="wealth-impact-thanks wealth-impact-thanks--ruled"
          >
            {columns.map((c) => (
              <div key={c.id} {...listItemAttr(K.thanksItems, c.index)}>
                {c.heading ? (
                  <h3 className="wealth-impact-thanks__title">{c.heading}</h3>
                ) : null}
                <ul>
                  {c.names.map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </WealthReveal>
        ) : null}
        {closing ? (
          <p
            {...fieldAttr(K.thanksClosing)}
            className="wealth-impact-thanks__donors"
          >
            {closing}
          </p>
        ) : null}
        {logos.length > 0 ? (
          <WealthReveal threshold={0} delay={1}>
            <ul
              className="wealth-impact-logos"
              {...(heading
                ? { "aria-labelledby": `${id}-h` }
                : { "aria-label": "Supporters" })}
            >
              {logos.map((l) => {
                const cell = (
                  <span className="wealth-impact-logos__img">
                    <Image
                      src={l.image}
                      alt={impactLogoLabel(l.name, l.url)}
                      fill
                      sizes="(min-width: 1000px) 200px, (min-width: 560px) 30vw, 46vw"
                    />
                  </span>
                );
                return (
                  <li key={l.id} {...listItemAttr(K.thanksLogos, l.index)}>
                    {l.url ? (
                      <a
                        href={l.url}
                        className="wealth-impact-logos__cell wealth-impact-logos__cell--link"
                        {...(isImpactExternalUrl(l.url)
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {cell}
                        <span
                          className="wealth-impact-logos__ext"
                          aria-hidden="true"
                        >
                          ↗
                        </span>
                        {isImpactExternalUrl(l.url) ? (
                          <span className="sr-only"> (opens in new tab)</span>
                        ) : null}
                      </a>
                    ) : (
                      <figure className="wealth-impact-logos__cell">
                        {cell}
                      </figure>
                    )}
                  </li>
                );
              })}
            </ul>
          </WealthReveal>
        ) : null}
      </div>
    </section>
  );
}
