import type { DefaultAboutPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { RelocationCredentialsBand } from "../shared/relocation-credentials-band";
import { RelocationReveal } from "../shared/relocation-reveal";
import { RelocationWaveHero } from "../shared/relocation-wave-hero";

/**
 * Backstory (`/about`) — design.md → "Per-page section concepts → Backstory":
 *
 *  1. Wave hero (tall) — "Backstory" + the stress-free blurb + CALL US TODAY.
 *     Deviation #1 (user-approved 2026-08-10): the source's flat charcoal
 *     hero is replaced with the standard terracotta wave, matching every
 *     other inner page.
 *  2. Crew collage — the five-strip photo below the hero.
 *  3. Story — three paragraphs (planning/heavy lifting · founders + the
 *     "Clear Soul Forces" link · Lowman pull-quote), then a closing photo.
 *  4. Credentials band (global, full heading — no homepage-style override).
 *
 * The mid-sentence "Clear Soul Forces" link splits paragraph 2 into three
 * fields (before / link / after) — see `./index.ts` for the rationale. Each
 * fragment gets its own `fieldAttr` since a `fieldAttr` may only sit on an
 * element whose textContent is exactly one field's value.
 */

const FIELD_KEYS = [
  "relocation.about.hero-heading",
  "relocation.about.hero-subheading",
  "relocation.about.hero-cta-label",
  "relocation.global.branding.phone-href",
  "relocation.about.collage-image",
  "relocation.about.collage-image-alt",
  "relocation.about.story-paragraph-1",
  "relocation.about.story-paragraph-2-before",
  "relocation.about.story-paragraph-2-link-label",
  "relocation.about.story-paragraph-2-link-url",
  "relocation.about.story-paragraph-2-after",
  "relocation.about.story-quote",
  "relocation.about.story-photo",
  "relocation.about.story-photo-alt",
] as const;

const BODY_TEXT_CLASS =
  "[font-family:var(--font-relocation-body)] text-[1.1875rem] leading-[1.875rem] font-medium tracking-[-0.19px] text-[var(--relocation-ink)] min-[1025px]:text-[1.4375rem] min-[1025px]:leading-[2.25rem] min-[1025px]:tracking-[-0.23px]";

export function RelocationAboutPage({
  business,
}: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, [...FIELD_KEYS]);

  const isVisible = (sectionId: string) =>
    isSectionVisible(customFields, "relocation", sectionId);

  const collageImage = f["relocation.about.collage-image"] ?? "";
  const storyPhoto = f["relocation.about.story-photo"] ?? "";
  const linkLabel = f["relocation.about.story-paragraph-2-link-label"] ?? "";
  const linkUrl = f["relocation.about.story-paragraph-2-link-url"] ?? "";

  return (
    <>
      <RelocationWaveHero
        title={f["relocation.about.hero-heading"] ?? ""}
        subtitle={f["relocation.about.hero-subheading"] ?? ""}
        ctaLabel={f["relocation.about.hero-cta-label"] ?? ""}
        ctaHref={f["relocation.global.branding.phone-href"] ?? ""}
        size="tall"
        sectionAttrs={sectionGroupAttr("about", "hero")}
        titleFieldAttrs={fieldAttr("relocation.about.hero-heading")}
        subtitleFieldAttrs={fieldAttr("relocation.about.hero-subheading")}
        ctaFieldAttrs={fieldAttr("relocation.about.hero-cta-label")}
      />

      {isVisible("about.collage") && collageImage !== "" ? (
        <section
          {...sectionGroupAttr("about", "collage")}
          aria-label="The Handy Relocations crew"
          className="w-full bg-[var(--relocation-paper)] pt-14 min-[1025px]:pt-21"
        >
          <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
            <RelocationReveal className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={collageImage}
                alt={f["relocation.about.collage-image-alt"] ?? ""}
                width={828}
                height={482}
                loading="lazy"
                decoding="async"
                className="block aspect-[828/482] w-full max-w-[21rem] object-cover min-[1025px]:max-w-[32rem]"
              />
            </RelocationReveal>
          </div>
        </section>
      ) : null}

      {isVisible("about.story") ? (
        <section
          {...sectionGroupAttr("about", "story")}
          aria-label="Our story"
          className="w-full bg-[var(--relocation-paper)] py-14 min-[1025px]:py-21"
        >
          <div className="mx-auto w-full max-w-[48rem] px-6 min-[572px]:px-10">
            <RelocationReveal className="flex flex-col gap-6">
              <p
                {...fieldAttr("relocation.about.story-paragraph-1")}
                className={BODY_TEXT_CLASS}
              >
                {f["relocation.about.story-paragraph-1"] ?? ""}
              </p>

              <p className={BODY_TEXT_CLASS}>
                <span
                  {...fieldAttr("relocation.about.story-paragraph-2-before")}
                >
                  {f["relocation.about.story-paragraph-2-before"] ?? ""}
                </span>
                {/* The leading `" "` is an explicit separator: JSX drops the
                    newline between fragments, so without it the sentence would
                    depend entirely on the owner keeping a trailing space in the
                    `-before` field. Runs of whitespace collapse, so it is a
                    no-op when they do keep one. The `-after` fragment opens
                    with a comma and deliberately gets no separator. */}
                {linkLabel !== "" ? (
                  <>
                    {" "}
                    {linkUrl !== "" ? (
                      <a
                        {...fieldAttr(
                          "relocation.about.story-paragraph-2-link-label",
                        )}
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relocation-hover-fade text-[var(--relocation-terracotta)] underline"
                      >
                        {linkLabel}
                      </a>
                    ) : (
                      <span
                        {...fieldAttr(
                          "relocation.about.story-paragraph-2-link-label",
                        )}
                      >
                        {linkLabel}
                      </span>
                    )}
                  </>
                ) : null}
                <span
                  {...fieldAttr("relocation.about.story-paragraph-2-after")}
                >
                  {f["relocation.about.story-paragraph-2-after"] ?? ""}
                </span>
              </p>

              <p
                {...fieldAttr("relocation.about.story-quote")}
                className={BODY_TEXT_CLASS}
              >
                {f["relocation.about.story-quote"] ?? ""}
              </p>
            </RelocationReveal>

            {storyPhoto !== "" ? (
              <RelocationReveal className="mt-10 flex justify-center min-[1025px]:mt-14">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storyPhoto}
                  alt={f["relocation.about.story-photo-alt"] ?? ""}
                  width={828}
                  height={1085}
                  loading="lazy"
                  decoding="async"
                  className="block aspect-[828/1085] w-full max-w-[18rem] object-cover min-[1025px]:max-w-[24rem]"
                />
              </RelocationReveal>
            ) : null}
          </div>
        </section>
      ) : null}

      <RelocationCredentialsBand customFields={customFields} />
    </>
  );
}
