import type { DefaultVideosPageTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { navHrefFlag } from "~/app/(storefront)/_components/nav";

import { resolveFields } from "..";
import { PinkCtaPanel } from "../shared/pink-cta-panel";
import { PinkEmptyState } from "../shared/pink-empty-state";
import { PinkPageHeader } from "../shared/pink-page-header";
import { PinkReveal } from "../shared/pink-reveal";
import { PinkVideoCard } from "./pink-video-card";

/**
 * First candidate that actually has visible text.
 *
 * A chain of `??` would be wrong here: an owner who clears a label field
 * leaves an empty STRING behind, not null, and `??` passes that straight
 * through — rendering a link with no text and no accessible name. Mirrors the
 * same guard on `pink-events-index-page.tsx`.
 */
function firstNonBlank(
  ...candidates: (string | null | undefined)[]
): string | undefined {
  return candidates.find((candidate) => candidate?.trim()) ?? undefined;
}

/**
 * `/videos` — every published `Video` for this business, in the owner's manual
 * order then newest first, as returned by `videos.getPublic`.
 *
 * Structural model: `pink-events-index-page.tsx` — flat light page header, a
 * grid of records, a closing CTA panel. NOT the hairline grid the events page
 * uses: a 16:9 thumbnail already carries a hard edge of its own, and bleeding
 * the line colour through a 1px gutter between two photographic tiles reads as
 * a rendering seam rather than a rule. Plain gutters, with the card's own ink
 * hairline doing the dividing.
 *
 * Stays a server component so `resolveFields` and `isSectionVisible` run on
 * the server; the only client boundary is the `VideoFacade` inside each card,
 * which mounts a YouTube iframe on click and never before.
 */
export async function PinkVideosPage({
  business,
  videos,
}: DefaultVideosPageTemplateProps) {
  const customFields = business.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "pink.videos.header-heading",
    "pink.videos.header-intro",
    "pink.videos.list-show-channel",
    "pink.videos.list-empty-heading",
    "pink.videos.list-empty-body",
    "pink.videos.list-empty-cta-label",
    "pink.videos.list-empty-cta-link",
    "pink.videos.cta-heading",
    "pink.videos.cta-body",
    "pink.videos.cta-primary-label",
    "pink.videos.cta-primary-link",
  ]);

  // `boolean` fields come back from `resolveFields` as strings.
  const showChannel = f["pink.videos.list-show-channel"] === "true";

  // B2.5: a field-driven CTA hides (never swaps destination) when its link's
  // feature is off — e.g. the empty state's default `/shop` with products off.
  const { isEnabled } = await getBusinessFlags();
  const ctaHref = (link: string | undefined): string | undefined => {
    const href = link?.trim();
    if (!href) return undefined;
    const flag = navHrefFlag(href);
    return flag === null || isEnabled(flag) ? href : undefined;
  };
  const primaryHref = ctaHref(f["pink.videos.cta-primary-link"]);

  return (
    <div className="flex flex-col">
      {/* ── 1. Header ─────────────────────────────────────────────────────── */}
      <PinkPageHeader
        sectionAttrs={sectionGroupAttr("videos", "header")}
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Videos" }]}
        heading={f["pink.videos.header-heading"] ?? ""}
        headingFieldKey="pink.videos.header-heading"
        intro={f["pink.videos.header-intro"] ?? ""}
        introFieldKey="pink.videos.header-intro"
      />

      {/* ── 2. List ───────────────────────────────────────────────────────── */}
      {/* Shell: gutter on the band, width on an unpadded wrapper — the same
          left edge as `PinkPageHeader` at every width. */}
      <section
        className="px-5 py-16 md:px-10 md:py-20"
        aria-label="Videos"
        {...sectionGroupAttr("videos", "list")}
      >
        <div className="mx-auto w-full max-w-[1400px]">
          {videos.length === 0 ? (
            <PinkEmptyState
              heading={
                firstNonBlank(
                  f["pink.videos.list-empty-heading"],
                  "Nothing up yet",
                ) ?? "Nothing up yet"
              }
              body={f["pink.videos.list-empty-body"] ?? ""}
              ctaLabel={firstNonBlank(f["pink.videos.list-empty-cta-label"])}
              ctaHref={ctaHref(
                firstNonBlank(f["pink.videos.list-empty-cta-link"], "/shop"),
              )}
            />
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video, i) => (
                <PinkReveal key={video.id} index={i}>
                  <PinkVideoCard video={video} showChannel={showChannel} />
                </PinkReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 3. Closing CTA ────────────────────────────────────────────────── */}
      {isSectionVisible(customFields, "pink", "videos.cta") && (
        <div className="px-5 pb-16 md:px-10 md:pb-20">
          <PinkReveal className="mx-auto w-full max-w-[1400px]">
            <PinkCtaPanel
              sectionAttrs={sectionGroupAttr("videos", "cta")}
              heading={f["pink.videos.cta-heading"] ?? ""}
              headingFieldKey="pink.videos.cta-heading"
              body={f["pink.videos.cta-body"] ?? ""}
              bodyFieldKey="pink.videos.cta-body"
              primaryCta={
                f["pink.videos.cta-primary-label"] && primaryHref
                  ? {
                      label: f["pink.videos.cta-primary-label"],
                      href: primaryHref,
                    }
                  : undefined
              }
              // No image pair here, unlike the events page's closing panel: a
              // page that is already twelve photographic tiles tall does not
              // need two more before its one call to action.
            />
          </PinkReveal>
        </div>
      )}
    </div>
  );
}
