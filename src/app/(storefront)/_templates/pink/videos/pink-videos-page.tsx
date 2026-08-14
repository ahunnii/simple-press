import type { DefaultVideosPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

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
      <section
        className="mx-auto w-full max-w-[1400px] px-5 py-16 md:px-10 md:py-20"
        aria-label="Videos"
        {...sectionGroupAttr("videos", "list")}
      >
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
            ctaHref={firstNonBlank(
              f["pink.videos.list-empty-cta-link"],
              "/shop",
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
      </section>

      {/* ── 3. Closing CTA ────────────────────────────────────────────────── */}
      {isSectionVisible(customFields, "pink", "videos.cta") && (
        <div className="mx-auto w-full max-w-[1400px] px-5 pb-16 md:px-10 md:pb-20">
          <PinkReveal>
            <PinkCtaPanel
              sectionAttrs={sectionGroupAttr("videos", "cta")}
              heading={f["pink.videos.cta-heading"] ?? ""}
              headingFieldKey="pink.videos.cta-heading"
              body={f["pink.videos.cta-body"] ?? ""}
              bodyFieldKey="pink.videos.cta-body"
              primaryCta={
                f["pink.videos.cta-primary-label"]
                  ? {
                      label: f["pink.videos.cta-primary-label"] ?? "",
                      href: f["pink.videos.cta-primary-link"] ?? "/contact",
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
