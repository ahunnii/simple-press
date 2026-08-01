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
import type { PinkHeroPanel } from "./pink-hero-strip";
import { PinkHeroSection } from "./pink-hero-section";
import { rowStr } from "./pink-homepage-list-utils";
import { PinkPopup } from "./pink-popup";
import { PinkPromisesSection } from "./pink-promises-section";
import { PinkStorySection } from "./pink-story-section";
import { PinkUpcomingSection } from "./pink-upcoming-section";

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

// Empty `image` on purpose: these panels sit inside the hero's dark band, so an
// unset panel should render as a bare dark tile (see PinkHeroStrip), not as a
// light `/placeholder.svg` stretched across the hero.
const DEFAULT_HERO_PANELS: PinkHeroPanel[] = [
  { image: "", caption: "Dolls, one at a time", depth: "1.4" },
  { image: "", caption: "Wool, cotton, polymer clay", depth: "0.8" },
  { image: "", caption: "Magnets and jewelry, small enough to carry", depth: "1.7" },
  { image: "", caption: "The studio table", depth: "1.0" },
];

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
const DEFAULT_EVENTS_MOSAIC: TemplateListRow[] = [
  { _id: "mosaic-1", image: "", colSpan: "2", rowSpan: "2" },
  { _id: "mosaic-2", image: "", colSpan: "1", rowSpan: "1" },
  { _id: "mosaic-3", image: "", colSpan: "1", rowSpan: "1" },
  { _id: "mosaic-4", image: "", colSpan: "2", rowSpan: "1" },
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

  const heroPanelsRaw = parseTemplateListRows(customFields?.["pink.homepage.hero-panels"]);
  const heroPanels: PinkHeroPanel[] =
    heroPanelsRaw.length > 0
      ? heroPanelsRaw.map((row) => ({
          image: typeof row.image === "string" ? row.image : "",
          caption: typeof row.caption === "string" ? row.caption : "",
          depth: typeof row.depth === "string" ? row.depth : "1",
          _id: row._id,
        }))
      : DEFAULT_HERO_PANELS;

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
          panels={heroPanels}
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
