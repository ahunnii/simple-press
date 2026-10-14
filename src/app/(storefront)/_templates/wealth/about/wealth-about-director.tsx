import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthArrowLink } from "../shared/wealth-arrow-link";
import { WealthBlock } from "../shared/wealth-block";
import { WealthOverlapCard } from "../shared/wealth-overlap-card";

type Props = {
  image: string;
  imageAlt: string;
  nameTitle: string;
  bio1: string;
  bio2: string;
  bio3: string;
  email: string;
};

/**
 * Director spotlight — a square headshot with the surface card overlapping
 * it: italic name/title heading, three bio paragraphs, mailto arrow link.
 * Hideable (about.director).
 */
export function WealthAboutDirector({
  image,
  imageAlt,
  nameTitle,
  bio1,
  bio2,
  bio3,
  email,
}: Props) {
  const bios = [
    { text: bio1, key: "wealth.about.director-bio-1" },
    { text: bio2, key: "wealth.about.director-bio-2" },
    { text: bio3, key: "wealth.about.director-bio-3" },
  ].filter((b) => b.text.trim() !== "");

  const content = (
    <>
      {nameTitle.trim() ? (
        <h2
          id="wealth-about-director-h"
          className="wealth-h2"
          {...fieldAttr("wealth.about.director-name-title")}
        >
          {nameTitle}
        </h2>
      ) : null}
      {bios.map((b) => (
        <p key={b.key} {...fieldAttr(b.key)}>
          {b.text}
        </p>
      ))}
      {email.trim() ? (
        <p>
          <WealthArrowLink
            href={`mailto:${email}`}
            className="wealth-about-director__email"
            {...fieldAttr("wealth.about.director-email")}
          >
            {email}
          </WealthArrowLink>
        </p>
      ) : null}
    </>
  );

  return (
    <WealthBlock
      tone="paper"
      aria-labelledby={nameTitle.trim() ? "wealth-about-director-h" : undefined}
      aria-label={nameTitle.trim() ? undefined : "Director spotlight"}
      {...sectionGroupAttr("about", "director")}
    >
      {image.trim() ? (
        <WealthOverlapCard
          image={image}
          imageAlt={imageAlt}
          tone="surface"
          className="wealth-about-director"
        >
          {content}
        </WealthOverlapCard>
      ) : (
        <div className="wealth-about-director wealth-about-director--solo wealth-on-surface">
          {content}
        </div>
      )}
    </WealthBlock>
  );
}
