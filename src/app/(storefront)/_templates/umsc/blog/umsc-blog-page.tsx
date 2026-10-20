import type { DefaultBlogPageTemplateProps } from "../../types";
import { DEFAULT_BLOG_PAGE_NAME } from "~/lib/blog-page-name";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { db } from "~/server/db";
import { api } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
// Default's resolver for the `default.blog.*` keys: umsc rendered Default's
// blog until 2026-09-28, so any saved copy lives there, and only Default's
// field map knows their `defaultValue`s.
import { resolveFields as resolveDefaultFields } from "../../default";
import { UmscGatedLink } from "../generic/umsc-gated-link";
import { UmscClosingBand, UmscEmptyState } from "../generic/umsc-page-kit";
import { resolveUmscHeroPhoto } from "../shared/umsc-hero-fields";
import { nonBlank } from "../shared/umsc-non-blank";
import { UmscPageHero } from "../shared/umsc-page-hero";
import {
  toUmscReviewCards,
  UmscReviewsSection,
} from "../shared/umsc-reviews-section";
import { UmscSection } from "../shared/umsc-section";
import { resolveUmscBlogFields } from "./index";
import { UmscBlogGallery } from "./umsc-blog-gallery";
import { UmscBlogList } from "./umsc-blog-list";

/** Default's `default.blog.listing-title` default before the page-name field. */
const LEGACY_LISTING_TITLE = "Blog";

type Props = DefaultBlogPageTemplateProps & {
  /** `blog/page.tsx` passes these beyond the nominal props (playbook note). */
  customFields?: Record<string, string>;
  business?: {
    id?: string;
    siteContent?: { customFields?: unknown } | null;
  } | null;
};

/**
 * `/blog` — umsc's "Community" page (same URL), on the generic page base
 * (parity PF22). Top to bottom:
 *
 * - `blog.header`: the black `UmscPageHero` — the saved listing heading, else
 *   the owner's page name (`umsc.blog.page-name`, "Community"), + Default's
 *   intro (`default.blog.*`).
 * - `blog.gallery` (hideable): cream band with the owner's community photo
 *   gallery (`UmscBlogGallery`); nothing on the public site until she picks one.
 * - `blog.list`: on the shared `UmscSection` container — search, the latest
 *   post as a split lead story, the rest as a card grid (client half in
 *   `UmscBlogList`), or the designed empty state with a flag-gated link.
 * - `blog.reviews` (hideable): cream band with the latest three approved
 *   testimonials, only while the testimonials feature is on. Reviewer labels
 *   reuse the homepage reviews keys.
 * - `blog.closing` (hideable): black closing band with one flag-gated button.
 *
 * Async server component (gallery + testimonials are fetched here), like the
 * About page.
 */
export async function UmscBlogPage({ pages, customFields, business }: Props) {
  const fields = customFields ?? business?.siteContent?.customFields;
  const d = resolveDefaultFields(fields, [
    "default.blog.listing-intro",
    "default.blog.listing-search-empty",
    "default.blog.listing-more-label",
  ]);
  // `listing-title` goes through umsc's map, where its default is empty so a
  // blank heading follows the owner's page name ("Community" by default).
  const f = resolveUmscBlogFields(fields, [
    "umsc.blog.page-name",
    "default.blog.listing-title",
    "umsc.blog.card-link-label",
    "umsc.blog.empty-heading",
    "umsc.blog.empty-body",
    "umsc.blog.empty-link-label",
    "umsc.blog.empty-link-url",
    "umsc.blog.hero-image",
    "umsc.blog.hero-image-alt",
    "umsc.blog.hero-image-behind",
    "umsc.blog.gallery-heading",
    "umsc.blog.gallery",
    "umsc.blog.reviews-heading",
    "umsc.blog.reviews-lede",
    "umsc.blog.reviews-empty-text",
    "umsc.blog.closing-heading",
    "umsc.blog.closing-body",
    "umsc.blog.closing-button-label",
    "umsc.blog.closing-button-url",
  ]);
  // Reviewer labels and the Google review link live on the homepage / global
  // groups; the umsc-wide resolver applies their defaults.
  const u = resolveFields(fields, [
    "umsc.homepage.reviews-verified-source",
    "umsc.global.google-review-url",
  ]);
  const { isEnabled } = await getBusinessFlags();

  const showGallery = isSectionVisible(fields, "umsc", "blog.gallery");
  const showReviews =
    isSectionVisible(fields, "umsc", "blog.reviews") &&
    isEnabled("testimonials");
  const showClosing = isSectionVisible(fields, "umsc", "blog.closing");

  const galleryId = f["umsc.blog.gallery"]?.trim() ?? "";
  // GalleryFieldSelect stores the literal string "none" when the owner picks
  // "None" — guard it so we don't query for a gallery literally named "none".
  const hasGallery = galleryId !== "" && galleryId !== "none";
  const gallery =
    showGallery && hasGallery && business?.id && isEnabled("galleries")
      ? await db.gallery.findUnique({
          where: { id: galleryId, businessId: business.id },
          include: { images: { orderBy: { sortOrder: "asc" } } },
        })
      : null;

  const testimonials = showReviews
    ? await api.testimonial.list({ publicOnly: true }).catch(() => [])
    : [];
  const reviewCards = toUmscReviewCards(
    testimonials,
    {
      verifiedSource: u["umsc.homepage.reviews-verified-source"] ?? "",
    },
    3,
  );

  // A saved heading of exactly "Blog" is Default's old field default, which
  // an editor publish writes back verbatim — treat it as unset so the
  // heading follows the page name. Any other saved heading wins.
  const listingTitle = nonBlank(f["default.blog.listing-title"]);
  const savedHeading =
    listingTitle === LEGACY_LISTING_TITLE ? undefined : listingTitle;

  return (
    <PageTransition>
      <UmscPageHero
        heading={
          savedHeading ??
          nonBlank(f["umsc.blog.page-name"]) ??
          DEFAULT_BLOG_PAGE_NAME
        }
        headingFieldKey="default.blog.listing-title"
        lede={d["default.blog.listing-intro"] ?? ""}
        ledeFieldKey="default.blog.listing-intro"
        {...resolveUmscHeroPhoto(f, "blog")}
        sectionAttrs={sectionGroupAttr("blog", "header")}
      />

      {showGallery && (
        <UmscBlogGallery
          heading={f["umsc.blog.gallery-heading"] ?? ""}
          gallery={gallery}
        />
      )}

      <UmscSection
        tone="paper"
        aria-label="Posts"
        sectionAttrs={sectionGroupAttr("blog", "list")}
      >
        {pages.length === 0 ? (
          <UmscEmptyState
            heading={
              nonBlank(f["umsc.blog.empty-heading"]) ??
              "Stories are on their way."
            }
            headingFieldKey="umsc.blog.empty-heading"
            body={f["umsc.blog.empty-body"]}
            bodyFieldKey="umsc.blog.empty-body"
          >
            <UmscGatedLink
              href={f["umsc.blog.empty-link-url"] ?? ""}
              label={f["umsc.blog.empty-link-label"] ?? ""}
              labelFieldKey="umsc.blog.empty-link-label"
              variant="link"
            />
          </UmscEmptyState>
        ) : (
          <UmscBlogList
            pages={pages}
            searchEmpty={
              nonBlank(d["default.blog.listing-search-empty"]) ??
              "No posts match your search."
            }
            moreLabel={d["default.blog.listing-more-label"] ?? ""}
            cardLinkLabel={f["umsc.blog.card-link-label"] ?? ""}
          />
        )}
      </UmscSection>

      {showReviews && (
        <UmscReviewsSection
          tone="cream"
          heading={f["umsc.blog.reviews-heading"] ?? ""}
          lede={f["umsc.blog.reviews-lede"] ?? ""}
          cards={reviewCards}
          emptyText={f["umsc.blog.reviews-empty-text"] ?? ""}
          googleReviewUrl={u["umsc.global.google-review-url"] ?? ""}
          sectionAttrs={sectionGroupAttr("blog", "reviews")}
          headingFieldKey="umsc.blog.reviews-heading"
          ledeFieldKey="umsc.blog.reviews-lede"
          emptyTextFieldKey="umsc.blog.reviews-empty-text"
          headingId="umsc-blog-reviews-heading"
        />
      )}

      {showClosing && (
        <UmscClosingBand
          sectionAttrs={sectionGroupAttr("blog", "closing")}
          heading={f["umsc.blog.closing-heading"] ?? ""}
          headingFieldKey="umsc.blog.closing-heading"
          body={f["umsc.blog.closing-body"]}
          bodyFieldKey="umsc.blog.closing-body"
        >
          <UmscGatedLink
            href={f["umsc.blog.closing-button-url"] ?? ""}
            label={f["umsc.blog.closing-button-label"] ?? ""}
            labelFieldKey="umsc.blog.closing-button-label"
          />
        </UmscClosingBand>
      )}
    </PageTransition>
  );
}
