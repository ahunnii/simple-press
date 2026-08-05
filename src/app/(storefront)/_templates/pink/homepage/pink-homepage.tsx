import type { DefaultHomepageTemplateProps } from "../../types";
import type { TemplateListRow } from "~/lib/template-fields";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolvePopup } from "~/lib/site-banner/resolve";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import type { PinkFactRow } from "../shared/pink-fact-rows";
import type { PinkFilterChipItem } from "../shared/pink-filter-chips";
import { PinkCollectionSection, type PinkFeaturedProduct } from "./pink-collection-section";
import { PinkEventsSection } from "./pink-events-section";
import { PinkHeroSection } from "./pink-hero-section";
import { rowStr } from "./pink-homepage-list-utils";
import { PinkPopup } from "./pink-popup";
import { PinkPromisesSection } from "./pink-promises-section";
import { PinkStorySection } from "./pink-story-section";
import { PinkUpcomingSection } from "./pink-upcoming-section";
import { PinkVideosSection } from "./pink-videos-section";

const FIELD_KEYS = [
  // hero
  "pink.homepage.hero-kicker",
  "pink.homepage.hero-kicker-trailing",
  "pink.homepage.hero-heading-line-1",
  "pink.homepage.hero-heading-line-2",
  "pink.homepage.hero-body",
  "pink.homepage.hero-cta-primary-label",
  "pink.homepage.hero-cta-primary-link",
  "pink.homepage.hero-cta-secondary-label",
  "pink.homepage.hero-cta-secondary-link",
  "pink.homepage.hero-image",
  "pink.homepage.hero-wordmark-accent",
  "pink.homepage.hero-wordmark-ink",
  "pink.homepage.hero-maker-1",
  "pink.homepage.hero-maker-1-alt",
  "pink.homepage.hero-maker-2",
  "pink.homepage.hero-maker-2-alt",
  "pink.homepage.hero-maker-3",
  "pink.homepage.hero-maker-3-alt",
  "pink.homepage.hero-maker-4",
  "pink.homepage.hero-maker-4-alt",
  "pink.homepage.hero-maker-5",
  "pink.homepage.hero-maker-5-alt",
  "pink.homepage.hero-doll-1",
  "pink.homepage.hero-doll-2",
  // collection
  "pink.homepage.collection-heading",
  "pink.homepage.collection-note",
  "pink.homepage.collection-cta-label",
  "pink.homepage.collection-cta-link",
  // upcoming (real dated events from the DB)
  "pink.homepage.upcoming-eyebrow",
  "pink.homepage.upcoming-heading",
  "pink.homepage.upcoming-note",
  "pink.homepage.upcoming-limit",
  "pink.homepage.upcoming-cta-label",
  "pink.homepage.upcoming-cta-link",
  "pink.homepage.upcoming-empty-heading",
  "pink.homepage.upcoming-empty-body",
  // events (the evergreen make & takes explainer — no dates)
  "pink.homepage.events-heading",
  "pink.homepage.events-note",
  "pink.homepage.events-body",
  "pink.homepage.events-cta-label",
  "pink.homepage.events-cta-link",
  "pink.homepage.events-cta-note",
  // videos (real Video records from the DB, synced from YouTube)
  "pink.homepage.videos-heading",
  "pink.homepage.videos-note",
  "pink.homepage.videos-limit",
  "pink.homepage.videos-cta-label",
  "pink.homepage.videos-cta-link",
  "pink.homepage.videos-empty-heading",
  "pink.homepage.videos-empty-body",
  // story
  "pink.homepage.story-image",
  "pink.homepage.story-image-alt",
  "pink.homepage.story-quote-before",
  "pink.homepage.story-quote-accent",
  "pink.homepage.story-quote-after",
  "pink.homepage.story-body",
];

// Presentable out-of-the-box defaults for list fields — a fresh store never
// ships blank (field-conventions.md → "Default-value rules"). Only used when
// the owner hasn't saved rows of their own yet.

const DEFAULT_PROMISES: TemplateListRow[] = [
  {
    _id: "promise-1",
    title: "One of a kind",
    body: "Every piece is made on its own, never in runs. No two are exactly alike.",
  },
  {
    _id: "promise-2",
    title: "Priced plainly",
    body: "Materials and time, no markup games. What you see is what you pay.",
  },
  {
    _id: "promise-3",
    title: "Natural materials",
    body: "100% wool filling, cotton fabrics, polymer clay faces.",
  },
];

// Same reasoning as the hero panels — the events mosaic renders on the dark band.
// Exactly five rows, because the mosaic is a fixed five-slot layout now: spans
// are placed in CSS rather than typed per row, so an owner can no longer produce
// a grid that overflows its band or leaves a hole in it.
const DEFAULT_EVENTS_MOSAIC: TemplateListRow[] = [
  { _id: "mosaic-1", image: "" },
  { _id: "mosaic-2", image: "" },
  { _id: "mosaic-3", image: "" },
  { _id: "mosaic-4", image: "" },
  { _id: "mosaic-5", image: "" },
];

// Mirrors the `pink-table` service page's hero fact rows — a make & take is
// hosted the same way whichever page describes it.
const DEFAULT_EVENTS_FACTS: PinkFactRow[] = [
  {
    _id: "fact-1",
    label: "Where",
    value: "Your space — school, church, library, workplace or back yard",
  },
  { _id: "fact-2", label: "Group size", value: "10 to 12 at a table" },
  { _id: "fact-3", label: "Materials", value: "Everything included" },
  { _id: "fact-4", label: "Notice", value: "Book at least 2 weeks out" },
];

export async function PinkHomepage({ business }: DefaultHomepageTemplateProps) {
  const rawCustomFields = business.siteContent?.customFields;
  const customFields = rawCustomFields as Record<string, unknown> | undefined;
  const f = resolveFields(rawCustomFields, FIELD_KEYS);

  // F4 (review 2026-07-29): pink previously never called resolvePopup, so an
  // owner-configured popup could never render on this template regardless of
  // the `popups` flag. Mirrors default-homepage.tsx's wiring exactly.
  const { isEnabled } = await getBusinessFlags();
  const popup = resolvePopup(business.siteContent, isEnabled("popups"));

  // The old hero collage's rows (`pink.homepage.hero-panels`) are gone along
  // with the collage layout that read them, and the v1 doll-trio's
  // `pink.homepage.hero-doll-3` key went with it in the v2 makers revision;
  // any values an owner saved for either before their respective redesign
  // landed are silently ignored, same precedent as other removed keys.

  const promiseItemsRaw = parseTemplateListRows(customFields?.["pink.homepage.promises-items"]);
  const promiseItems = promiseItemsRaw.length > 0 ? promiseItemsRaw : DEFAULT_PROMISES;

  const eventsMosaicRaw = parseTemplateListRows(customFields?.["pink.homepage.events-mosaic"]);
  const eventsMosaic = eventsMosaicRaw.length > 0 ? eventsMosaicRaw : DEFAULT_EVENTS_MOSAIC;

  const eventsFactsRaw = parseTemplateListRows(customFields?.["pink.homepage.events-facts"]);
  const eventsFacts: PinkFactRow[] = (
    eventsFactsRaw.length > 0
      ? eventsFactsRaw.map((row) => ({
          label: rowStr(row, "label"),
          value: rowStr(row, "value"),
          _id: row._id,
        }))
      : DEFAULT_EVENTS_FACTS
  ).filter((row) => row.label !== "" || row.value !== "");

  // Real featured products (design.md: "renders real featured products from
  // business.products"), featured-first, capped at 6 for a 3-column grid.
  const products: PinkFeaturedProduct[] = [...(business.products ?? [])]
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 6)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      featured: p.featured,
      images: [...p.images].sort((a, b) => a.sortOrder - b.sortOrder),
      additionalFields: p.additionalFields,
    }));

  // Real collections for the hairline chip row — gracefully empty when the
  // `collections` feature is off (featureGate throws, caught to []).
  const collections = await api.collections.getAllPublic().catch(() => []);

  // `upcoming-limit` is a `number` FIELD but `resolveFields` hands back strings,
  // and an owner can type anything into it. Clamped to 1–6: the row is three
  // cards wide, and a homepage is a teaser for /events, not the calendar.
  const parsedUpcomingLimit = Number.parseInt(
    f["pink.homepage.upcoming-limit"] ?? "",
    10,
  );
  const upcomingLimit = Number.isFinite(parsedUpcomingLimit)
    ? Math.min(Math.max(parsedUpcomingLimit, 1), 6)
    : 3;

  // MANDATORY `.catch`: the `events` flag ships OFF, so `getUpcomingPublic`'s
  // own featureGate throws FORBIDDEN on every store that hasn't opted in — an
  // uncaught throw here 500s the whole homepage. Same shape as the
  // `collections.getAllPublic()` catch above.
  const upcomingEvents = await api.events
    .getUpcomingPublic({ limit: upcomingLimit })
    .catch(() => []);

  // Same clamp and the same reasoning as `upcoming-limit` above — a `number`
  // field arrives as a string an owner can type anything into, and the strip
  // is a teaser for /videos, not the whole gallery.
  const parsedVideosLimit = Number.parseInt(
    f["pink.homepage.videos-limit"] ?? "",
    10,
  );
  const videosLimit = Number.isFinite(parsedVideosLimit)
    ? Math.min(Math.max(parsedVideosLimit, 1), 6)
    : 3;

  // MANDATORY `.catch`, exactly as above: the `videos` flag ships OFF, so
  // `getPublic`'s own featureGate throws FORBIDDEN on every store that hasn't
  // opted in, and an uncaught throw here 500s the whole homepage.
  const homepageVideos = await api.videos
    .getPublic({ limit: videosLimit })
    .catch(() => []);

  const collectionChips: PinkFilterChipItem[] = [
    { id: "all", label: "All pieces", href: "/shop" },
    ...collections.slice(0, 4).map((c) => ({ id: c.id, label: c.name, href: `/collections/${c.slug}` })),
  ];

  return (
    <HydrateClient>
      {popup && <PinkPopup popup={popup} />}
      <PageTransition>
        <PinkHeroSection
          kicker={f["pink.homepage.hero-kicker"] ?? ""}
          kickerTrailing={f["pink.homepage.hero-kicker-trailing"] ?? ""}
          headingLine1={f["pink.homepage.hero-heading-line-1"] ?? ""}
          headingLine2={f["pink.homepage.hero-heading-line-2"] ?? ""}
          body={f["pink.homepage.hero-body"] ?? ""}
          ctaPrimaryLabel={f["pink.homepage.hero-cta-primary-label"] ?? ""}
          ctaPrimaryLink={f["pink.homepage.hero-cta-primary-link"] ?? "/shop"}
          ctaSecondaryLabel={f["pink.homepage.hero-cta-secondary-label"] ?? ""}
          ctaSecondaryLink={f["pink.homepage.hero-cta-secondary-link"] ?? "#make-and-takes"}
          image={f["pink.homepage.hero-image"] ?? ""}
          wordmarkAccent={f["pink.homepage.hero-wordmark-accent"] ?? ""}
          wordmarkInk={f["pink.homepage.hero-wordmark-ink"] ?? ""}
          cornerDollLeft={f["pink.homepage.hero-doll-1"] ?? ""}
          cornerDollRight={f["pink.homepage.hero-doll-2"] ?? ""}
          maker1={f["pink.homepage.hero-maker-1"] ?? ""}
          maker1Alt={f["pink.homepage.hero-maker-1-alt"] ?? ""}
          maker2={f["pink.homepage.hero-maker-2"] ?? ""}
          maker2Alt={f["pink.homepage.hero-maker-2-alt"] ?? ""}
          maker3={f["pink.homepage.hero-maker-3"] ?? ""}
          maker3Alt={f["pink.homepage.hero-maker-3-alt"] ?? ""}
          maker4={f["pink.homepage.hero-maker-4"] ?? ""}
          maker4Alt={f["pink.homepage.hero-maker-4-alt"] ?? ""}
          maker5={f["pink.homepage.hero-maker-5"] ?? ""}
          maker5Alt={f["pink.homepage.hero-maker-5-alt"] ?? ""}
        />

        {isSectionVisible(customFields, "pink", "homepage.promises") && (
          <PinkPromisesSection items={promiseItems} />
        )}

        {isSectionVisible(customFields, "pink", "homepage.collection") && (
          <PinkCollectionSection
            heading={f["pink.homepage.collection-heading"] ?? ""}
            note={f["pink.homepage.collection-note"] ?? ""}
            ctaLabel={f["pink.homepage.collection-cta-label"] ?? ""}
            ctaLink={f["pink.homepage.collection-cta-link"] ?? "/shop"}
            products={products}
            collectionChips={collectionChips}
          />
        )}

        {/* Make & Takes leads the calendar: it explains what a make & take
            actually is, which the dated cards below assume the reader already
            knows. */}
        {isSectionVisible(customFields, "pink", "homepage.events") && (
          <PinkEventsSection
            heading={f["pink.homepage.events-heading"] ?? ""}
            note={f["pink.homepage.events-note"] ?? ""}
            body={f["pink.homepage.events-body"] ?? ""}
            mosaic={eventsMosaic}
            facts={eventsFacts}
            ctaLabel={f["pink.homepage.events-cta-label"] ?? ""}
            ctaLink={f["pink.homepage.events-cta-link"] ?? "/contact"}
            ctaNote={f["pink.homepage.events-cta-note"] ?? ""}
          />
        )}

        {/* Flag-gated as well as section-gated: with `events` off there is no
            calendar to be empty, so the band's "nothing scheduled yet" state
            would promise dates the store can never publish. */}
        {isEnabled("events") &&
          isSectionVisible(customFields, "pink", "homepage.upcoming") && (
            <PinkUpcomingSection
              eyebrow={f["pink.homepage.upcoming-eyebrow"] ?? ""}
              heading={f["pink.homepage.upcoming-heading"] ?? ""}
              note={f["pink.homepage.upcoming-note"] ?? ""}
              ctaLabel={f["pink.homepage.upcoming-cta-label"] ?? ""}
              ctaLink={f["pink.homepage.upcoming-cta-link"] ?? "/events"}
              emptyHeading={f["pink.homepage.upcoming-empty-heading"] ?? ""}
              emptyBody={f["pink.homepage.upcoming-empty-body"] ?? ""}
              events={upcomingEvents}
              timeZone={business.timeZone}
            />
          )}

        {/* Flag-gated as well as section-gated, same as the upcoming band:
            with `videos` off there is no gallery to be empty, so the strip's
            "nothing up yet" state would promise clips the store can never
            publish. */}
        {isEnabled("videos") &&
          isSectionVisible(customFields, "pink", "homepage.videos") && (
            <PinkVideosSection
              heading={f["pink.homepage.videos-heading"] ?? ""}
              note={f["pink.homepage.videos-note"] ?? ""}
              ctaLabel={f["pink.homepage.videos-cta-label"] ?? ""}
              ctaLink={f["pink.homepage.videos-cta-link"] ?? "/videos"}
              emptyHeading={f["pink.homepage.videos-empty-heading"] ?? ""}
              emptyBody={f["pink.homepage.videos-empty-body"] ?? ""}
              videos={homepageVideos}
            />
          )}

        {isSectionVisible(customFields, "pink", "homepage.story") && (
          <PinkStorySection
            image={f["pink.homepage.story-image"] ?? "/placeholder.svg"}
            imageAlt={f["pink.homepage.story-image-alt"] ?? ""}
            quoteBefore={f["pink.homepage.story-quote-before"] ?? ""}
            quoteAccent={f["pink.homepage.story-quote-accent"] ?? ""}
            quoteAfter={f["pink.homepage.story-quote-after"] ?? ""}
            body={f["pink.homepage.story-body"] ?? ""}
          />
        )}
      </PageTransition>
    </HydrateClient>
  );
}
