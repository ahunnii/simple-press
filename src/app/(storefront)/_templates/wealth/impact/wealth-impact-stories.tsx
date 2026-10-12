import Image from "next/image";

import type { ImpactStory } from "./impact-rows";
import type { ImpactFields } from "./wealth-impact-head";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";

import { WealthArrowLink } from "../shared/wealth-arrow-link";
import { WealthPostCard } from "../shared/wealth-post-card";
import { WealthReveal } from "../shared/wealth-reveal";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { anchorProps, ImpactSectionHead, val } from "./wealth-impact-head";

export const IMPACT_STORIES_ID = "stories";

type Props = {
  f: ImpactFields;
  /** Parsed rows; `url` is already "" for flag-disabled routes. */
  stories: ImpactStory[];
  /** See-all link href, or "" when unset / its route is switched off. */
  seeAllUrl: string;
  /** v2: render-order section number (cover = 1). */
  number?: number;
};

/** Same `.wealth-post` markup as `WealthPostCard`, for a story with no link. */
function StaticStoryCard({
  story,
  attrs,
}: {
  story: ImpactStory;
  attrs: Record<string, string>;
}) {
  return (
    <article {...attrs} className="wealth-post wealth-impact-story">
      {story.image ? (
        <div className="wealth-post__media">
          <Image
            src={story.image}
            alt={story.imageAlt}
            fill
            sizes="(min-width: 720px) 33vw, 100vw"
          />
        </div>
      ) : null}
      <div className="wealth-post__body">
        {story.label ? (
          <p className="wealth-post__meta">{story.label}</p>
        ) : null}
        <h3 className="wealth-post__title">{story.name}</h3>
        {story.summary ? (
          <p className="wealth-post__excerpt">{story.summary}</p>
        ) : null}
      </div>
    </article>
  );
}

/**
 * 6 · Co-op stories: `WealthPostCard`s on a surface block (logo-friendly
 * contained media via `.wealth-impact-story`). Cards without a link render
 * the same card without the title link or button.
 */
export function WealthImpactStories({ f, stories, seeAllUrl, number }: Props) {
  const id = IMPACT_STORIES_ID;
  const seeAllLabel = val(f, K.storiesLinkLabel);
  const buttonLabel = val(f, K.storiesButtonLabel);

  return (
    <section
      {...sectionGroupAttr("impact", "stories")}
      {...anchorProps(id, val(f, K.storiesHeading))}
      className="wealth-section wealth-on-surface wealth-impact-anchor"
    >
      <div className="wealth-container">
        <ImpactSectionHead
          sectionId={id}
          number={number}
          eyebrow={val(f, K.storiesEyebrow)}
          eyebrowKey={K.storiesEyebrow}
          heading={val(f, K.storiesHeading)}
          headingKey={K.storiesHeading}
          aside={
            seeAllUrl && seeAllLabel ? (
              <WealthArrowLink href={seeAllUrl}>
                <span {...fieldAttr(K.storiesLinkLabel)}>{seeAllLabel}</span>
              </WealthArrowLink>
            ) : null
          }
        />
        <WealthReveal threshold={0} className="wealth-posts">
          {stories.map((s) => {
            const attrs = listItemAttr(K.storiesItems, s.index);
            return s.url ? (
              <WealthPostCard
                key={s.id}
                {...attrs}
                className="wealth-impact-story"
                href={s.url}
                title={s.name}
                image={s.image || null}
                imageAlt={s.imageAlt}
                meta={s.label || undefined}
                excerpt={s.summary || undefined}
                ctaLabel={buttonLabel}
              />
            ) : (
              <StaticStoryCard key={s.id} story={s} attrs={attrs} />
            );
          })}
        </WealthReveal>
      </div>
    </section>
  );
}
