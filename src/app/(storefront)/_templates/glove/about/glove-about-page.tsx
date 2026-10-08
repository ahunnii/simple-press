import Image from "next/image";

import type { DefaultAboutPageTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateIframeValue } from "~/lib/template-fields";
import { parseYouTubeVideoId } from "~/lib/youtube/parse";
import { EmbedFrame } from "~/components/embed-frame";
import { VideoFacade } from "~/components/video-facade";
import { navHrefFlag } from "~/app/(storefront)/_components/nav/nav-flags";

import { resolveFields } from "..";
import { GloveButton, GloveSection } from "../shared";
import { GloveInlineLinks } from "./glove-inline-links";

const FIELD_KEYS = [
  "glove.about.page-title",
  "glove.about.mission-heading",
  "glove.about.mission-body",
  "glove.about.values-heading",
  "glove.about.values-body",
  "glove.about.story-video",
  "glove.about.story-heading",
  "glove.about.story-subheading",
  "glove.about.story-subtitle",
  "glove.about.story-body",
  "glove.about.press-heading",
  "glove.about.press-intro",
  "glove.about.press-quote",
  "glove.about.press-button-label",
  "glove.about.press-button-url",
  "glove.about.press-image",
  "glove.about.press-image-alt",
  "glove.about.founder-image",
  "glove.about.founder-image-alt",
  "glove.about.founder-heading",
  "glove.about.founder-subheading",
  "glove.about.founder-bio-1",
  "glove.about.founder-bio-2",
  "glove.about.gift-heading",
  "glove.about.gift-body",
  "glove.about.shop-heading",
  "glove.about.shop-body",
  "glove.about.offering-overline",
  "glove.about.offering-heading",
  "glove.about.offering-body",
  "glove.about.offering-button-label",
  "glove.about.offering-button-url",
  "glove.about.charms-heading",
  "glove.about.charms-body",
  "glove.about.touch-heading",
  "glove.about.touch-body",
  "glove.about.difference-heading",
  "glove.about.difference-body",
];

const PROSE = "max-w-[75ch] text-[var(--glove-text)]";
const BOX_BORDER =
  "border-[3px] border-solid border-[color-mix(in_srgb,var(--glove-primary)_70%,transparent)]";

/** Soft shadow frame used by the portrait, press picture and video. */
const FRAME =
  "overflow-hidden rounded-[var(--glove-radius-card)] shadow-[var(--glove-shadow-md)]";

export async function GloveAboutPage({
  business,
}: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const { isEnabled } = await getBusinessFlags();
  const f = resolveFields(customFields, FIELD_KEYS);
  const get = (key: string) => (f[`glove.about.${key}`] ?? "").trim();
  const show = (group: string) =>
    isSectionVisible(customFields, "glove", `about.${group}`);

  // ── Story video ──
  const video = parseTemplateIframeValue(f["glove.about.story-video"]);
  const youtubeId = video ? parseYouTubeVideoId(video.src) : null;
  const videoTitleRaw = video?.title.trim() ?? "";
  const videoTitle =
    videoTitleRaw !== "" ? videoTitleRaw : get("story-heading");

  // ── Press ──
  const pressUrlRaw = get("press-button-url");
  const pressFlag = navHrefFlag(pressUrlRaw);
  const pressUrl =
    pressFlag === null || isEnabled(pressFlag) ? pressUrlRaw : "";
  const pressExternal = /^https?:\/\//i.test(pressUrl);
  const pressImage = get("press-image");
  const pressHeading = get("press-heading");

  // ── Offering CTA (B2.5: hide, never swap the destination) ──
  const offeringUrl = get("offering-button-url");
  const offeringFlag = navHrefFlag(offeringUrl);
  const offeringButtonVisible =
    get("offering-button-label") !== "" &&
    offeringUrl !== "" &&
    (offeringFlag === null || isEnabled(offeringFlag));

  const founderImage = get("founder-image");
  const bio2 = get("founder-bio-2");

  const notes = [
    {
      heading: get("charms-heading"),
      headingKey: "glove.about.charms-heading",
      body: get("charms-body"),
      bodyKey: "glove.about.charms-body",
      links: false,
    },
    {
      heading: get("touch-heading"),
      headingKey: "glove.about.touch-heading",
      body: get("touch-body"),
      bodyKey: "glove.about.touch-body",
      links: true,
    },
    {
      heading: get("difference-heading"),
      headingKey: "glove.about.difference-heading",
      body: get("difference-body"),
      bodyKey: "glove.about.difference-body",
      links: false,
    },
  ].filter((n) => n.heading !== "");

  const giftHeading = get("gift-heading");
  const shopHeading = get("shop-heading");

  return (
    <>
      {/* 1 — Mission & values (not hideable; carries the page's H1) */}
      <GloveSection
        aria-labelledby="glove-about-mission"
        sectionAttrs={sectionGroupAttr("about", "values")}
        revealThreshold={0}
      >
        <h1 className="sr-only" {...fieldAttr("glove.about.page-title")}>
          {get("page-title")}
        </h1>
        <div className="grid gap-5 md:grid-cols-2 md:gap-6">
          <div className={`${BOX_BORDER} p-6 md:p-8`}>
            <h2
              id="glove-about-mission"
              className="glove-display text-[26px] leading-[1.25] font-medium text-[var(--glove-ink)] md:text-[32px]"
              {...fieldAttr("glove.about.mission-heading")}
            >
              {get("mission-heading")}
            </h2>
            <p className="mt-4" {...fieldAttr("glove.about.mission-body")}>
              {get("mission-body")}
            </p>
          </div>
          <div className={`${BOX_BORDER} p-6 md:p-8`}>
            <h2
              className="glove-display text-[26px] leading-[1.25] font-medium text-[var(--glove-ink)] md:text-[32px]"
              {...fieldAttr("glove.about.values-heading")}
            >
              {get("values-heading")}
            </h2>
            <p className="mt-4" {...fieldAttr("glove.about.values-body")}>
              {get("values-body")}
            </p>
          </div>
        </div>
      </GloveSection>

      {/* 2 — The LuvGluv story */}
      {show("story") && (
        <GloveSection
          aria-labelledby="glove-about-story"
          sectionAttrs={sectionGroupAttr("about", "story")}
          revealThreshold={0}
          style={{ paddingTop: 0 }}
        >
          <div
            className={
              video
                ? "grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
                : "grid"
            }
          >
            {video ? (
              <div className={FRAME}>
                {youtubeId ? (
                  <VideoFacade
                    youtubeId={youtubeId}
                    title={videoTitle}
                    thumbnailUrl={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
                    className="!rounded-none"
                  />
                ) : (
                  <EmbedFrame
                    src={video.src}
                    height={video.height}
                    title={videoTitle}
                    aspectRatio={video.aspectRatio}
                    fill
                  />
                )}
              </div>
            ) : null}
            <div className={PROSE}>
              <h2
                id="glove-about-story"
                className="glove-display text-[28px] leading-[1.2] font-semibold text-[var(--glove-primary)] md:text-[36px]"
                {...fieldAttr("glove.about.story-heading")}
              >
                {get("story-heading")}
              </h2>
              {get("story-subheading") ? (
                <p
                  className="mt-3"
                  {...fieldAttr("glove.about.story-subheading")}
                >
                  {get("story-subheading")}
                </p>
              ) : null}
              {get("story-subtitle") ? (
                <h3
                  className="glove-display mt-6 text-[18px] leading-[1.35] font-semibold text-[var(--glove-ink)] md:text-[20px]"
                  {...fieldAttr("glove.about.story-subtitle")}
                >
                  {get("story-subtitle")}
                </h3>
              ) : null}
              {get("story-body") ? (
                <p className="mt-2" {...fieldAttr("glove.about.story-body")}>
                  {get("story-body")}
                </p>
              ) : null}
            </div>
          </div>
        </GloveSection>
      )}

      {/* 3 — In the press */}
      {show("press") && (
        <GloveSection
          aria-labelledby="glove-about-press"
          sectionAttrs={sectionGroupAttr("about", "press")}
          revealThreshold={0}
          style={{ paddingTop: 0 }}
        >
          <div
            className={
              pressImage
                ? "grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
                : "grid"
            }
          >
            <div className={PROSE}>
              <h2
                id="glove-about-press"
                className="glove-display text-[26px] leading-[1.25] font-medium text-[var(--glove-ink)] md:text-[32px]"
                {...fieldAttr("glove.about.press-heading")}
              >
                {pressHeading}
              </h2>
              {get("press-intro") ? (
                <p className="mt-4" {...fieldAttr("glove.about.press-intro")}>
                  {get("press-intro")}
                </p>
              ) : null}
              {get("press-quote") ? (
                <p
                  className="mt-4 border-l-[3px] border-[var(--glove-primary-tint)] pl-4 italic"
                  {...fieldAttr("glove.about.press-quote")}
                >
                  {get("press-quote")}
                </p>
              ) : null}
              {pressUrl && get("press-button-label") ? (
                <div className="mt-6">
                  <GloveButton
                    href={pressUrl}
                    external={pressExternal}
                    variant="woo"
                  >
                    <span {...fieldAttr("glove.about.press-button-label")}>
                      {get("press-button-label")}
                    </span>
                  </GloveButton>
                </div>
              ) : null}
            </div>
            {pressImage ? (
              <div className="w-full max-w-[400px] lg:justify-self-end">
                {pressUrl ? (
                  <a
                    href={pressUrl}
                    {...(pressExternal
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className={`relative block aspect-[4/5] w-full ${FRAME}`}
                  >
                    <Image
                      src={pressImage}
                      alt={get("press-image-alt") || pressHeading}
                      fill
                      sizes="(min-width: 1024px) 400px, 100vw"
                      className="object-cover"
                    />
                    {pressExternal ? (
                      <span className="sr-only"> (opens in new tab)</span>
                    ) : null}
                  </a>
                ) : (
                  <div className={`relative aspect-[4/5] w-full ${FRAME}`}>
                    <Image
                      src={pressImage}
                      alt={get("press-image-alt")}
                      fill
                      sizes="(min-width: 1024px) 400px, 100vw"
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </GloveSection>
      )}

      {/* 4 — Meet the founder */}
      {show("founder") && (
        <GloveSection
          aria-labelledby="glove-about-founder"
          sectionAttrs={sectionGroupAttr("about", "founder")}
          revealThreshold={0}
          style={{ paddingTop: 0 }}
        >
          <div
            className={
              founderImage
                ? "grid items-start gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-14"
                : "grid"
            }
          >
            {founderImage ? (
              <div
                className={`relative aspect-[4/5] w-full max-w-[380px] bg-[var(--glove-cloud)] ${FRAME}`}
              >
                <Image
                  src={founderImage}
                  alt={get("founder-image-alt") || get("founder-heading")}
                  fill
                  sizes="(min-width: 1024px) 380px, 100vw"
                  className="object-cover object-top"
                />
              </div>
            ) : null}
            <div className={PROSE}>
              <h2
                id="glove-about-founder"
                className="glove-display text-[28px] leading-[1.2] font-semibold text-[var(--glove-primary)] md:text-[36px]"
                {...fieldAttr("glove.about.founder-heading")}
              >
                {get("founder-heading")}
              </h2>
              {get("founder-subheading") ? (
                <p
                  className="mt-3 font-bold text-[var(--glove-ink)]"
                  {...fieldAttr("glove.about.founder-subheading")}
                >
                  {get("founder-subheading")}
                </p>
              ) : null}
              {get("founder-bio-1") ? (
                <p className="mt-4" {...fieldAttr("glove.about.founder-bio-1")}>
                  {get("founder-bio-1")}
                </p>
              ) : null}
              {bio2 ? (
                <p className="mt-4" {...fieldAttr("glove.about.founder-bio-2")}>
                  {bio2}
                </p>
              ) : null}
              {giftHeading || shopHeading ? (
                <div className="mt-8 space-y-6 border-t border-[var(--glove-line)] pt-6">
                  {giftHeading ? (
                    <div>
                      <h3 className="glove-display text-[18px] leading-[1.35] font-semibold text-[var(--glove-ink)] md:text-[20px]">
                        <GloveInlineLinks
                          text={giftHeading}
                          isEnabled={isEnabled}
                        />
                      </h3>
                      {get("gift-body") ? (
                        <p
                          className="mt-1"
                          {...fieldAttr("glove.about.gift-body")}
                        >
                          {get("gift-body")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {shopHeading ? (
                    <div>
                      <h3 className="glove-display text-[18px] leading-[1.35] font-semibold text-[var(--glove-ink)] md:text-[20px]">
                        <GloveInlineLinks
                          text={shopHeading}
                          isEnabled={isEnabled}
                        />
                      </h3>
                      {get("shop-body") ? (
                        <p
                          className="mt-1"
                          {...fieldAttr("glove.about.shop-body")}
                        >
                          {get("shop-body")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </GloveSection>
      )}

      {/* 5 — Our offering */}
      {show("offering") && (
        <GloveSection
          aria-labelledby="glove-about-offering"
          sectionAttrs={sectionGroupAttr("about", "offering")}
          revealThreshold={0}
          style={{ paddingTop: 0 }}
        >
          <div className={PROSE}>
            {get("offering-overline") ? (
              <p
                className="glove-display text-[20px] leading-[1.3] font-medium text-[var(--glove-primary)] md:text-[24px]"
                {...fieldAttr("glove.about.offering-overline")}
              >
                {get("offering-overline")}
              </p>
            ) : null}
            <h2
              id="glove-about-offering"
              className="glove-display mt-1 text-[26px] leading-[1.25] font-medium text-[var(--glove-ink)] md:text-[36px]"
              {...fieldAttr("glove.about.offering-heading")}
            >
              {get("offering-heading")}
            </h2>
            {get("offering-body") ? (
              <p className="mt-4" {...fieldAttr("glove.about.offering-body")}>
                {get("offering-body")}
              </p>
            ) : null}
            {offeringButtonVisible ? (
              <div className="mt-6">
                <GloveButton href={offeringUrl} variant="woo">
                  <span {...fieldAttr("glove.about.offering-button-label")}>
                    {get("offering-button-label")}
                  </span>
                </GloveButton>
              </div>
            ) : null}
          </div>

          {notes.length > 0 ? (
            <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
              {notes.map((note) => (
                <div
                  key={note.headingKey}
                  className="border-t-[3px] border-[var(--glove-primary)] pt-5"
                >
                  <h3
                    className="glove-display text-[18px] leading-[1.35] font-semibold text-[var(--glove-ink)] md:text-[20px]"
                    {...fieldAttr(note.headingKey)}
                  >
                    {note.heading}
                  </h3>
                  {note.body ? (
                    note.links ? (
                      <p className="mt-2">
                        <GloveInlineLinks
                          text={note.body}
                          isEnabled={isEnabled}
                        />
                      </p>
                    ) : (
                      <p className="mt-2" {...fieldAttr(note.bodyKey)}>
                        {note.body}
                      </p>
                    )
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </GloveSection>
      )}
    </>
  );
}
