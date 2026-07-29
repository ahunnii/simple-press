import type { DefaultHomepageTemplateProps } from "../../types";
import type { TemplateListRow } from "~/lib/template-fields";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
import { api, HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import type { PinkFilterChipItem } from "../shared/pink-filter-chips";
import { PinkCollectionSection, type PinkFeaturedProduct } from "./pink-collection-section";
import { PinkEventsSection } from "./pink-events-section";
import type { PinkHeroPanel } from "./pink-hero-strip";
import { PinkHeroSection } from "./pink-hero-section";
import { PinkPromisesSection } from "./pink-promises-section";
import { PinkStorySection } from "./pink-story-section";

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
  "pink.homepage.collection-eyebrow",
  "pink.homepage.collection-heading",
  "pink.homepage.collection-note",
  "pink.homepage.collection-cta-label",
  "pink.homepage.collection-cta-link",
  // events
  "pink.homepage.events-eyebrow",
  "pink.homepage.events-heading",
  "pink.homepage.events-note",
  // story
  "pink.homepage.story-image",
  "pink.homepage.story-image-alt",
  "pink.homepage.story-eyebrow",
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
  { image: "", caption: "Spirit dolls, one at a time", depth: "1.4" },
  { image: "", caption: "Cloth, thread, a little wire", depth: "0.8" },
  { image: "", caption: "Magnets, small enough to carry", depth: "1.7" },
  { image: "", caption: "The studio table", depth: "1.0" },
];

const DEFAULT_PROMISES: TemplateListRow[] = [
  {
    _id: "promise-1",
    title: "Made by hand",
    body: "Every piece is sewn one at a time. No two are exactly alike.",
  },
  {
    _id: "promise-2",
    title: "Priced plainly",
    body: "Materials and time, no markup games. What you see is what you pay.",
  },
  {
    _id: "promise-3",
    title: "Repaired for free",
    body: "Repairs are free for life. Bring it back if a stitch ever gives.",
  },
];

// Same reasoning as the hero panels — the events mosaic renders on the dark band.
const DEFAULT_EVENTS_MOSAIC: TemplateListRow[] = [
  { _id: "mosaic-1", image: "", colSpan: "2", rowSpan: "2" },
  { _id: "mosaic-2", image: "", colSpan: "1", rowSpan: "1" },
  { _id: "mosaic-3", image: "", colSpan: "1", rowSpan: "1" },
  { _id: "mosaic-4", image: "", colSpan: "2", rowSpan: "1" },
];

const DEFAULT_EVENTS_CARDS: TemplateListRow[] = [
  {
    _id: "event-1",
    date: "Sat, Aug 8",
    availability: "Four seats left",
    title: "Make a spirit doll",
    body: "Bring nothing. We supply cloth, batting, thread and a good chair.",
    price: "$65, materials in.",
    ctaLabel: "Save a seat",
    ctaHref: "/contact",
  },
  {
    _id: "event-2",
    date: "Sat, Aug 22",
    availability: "Open",
    title: "Magnet making",
    body: "A short one — good for kids and first-timers.",
    price: "$25, materials in.",
    ctaLabel: "Save a seat",
    ctaHref: "/contact",
  },
  {
    _id: "event-3",
    date: "Sat, Sep 12",
    availability: "Waitlist",
    title: "Make a spirit doll",
    body: "Our most-requested session. Runs about two and a half hours.",
    price: "$65, materials in.",
    ctaLabel: "Join the waitlist",
    ctaHref: "/contact",
  },
];

const DEFAULT_STORY_STATS: TemplateListRow[] = [
  { _id: "stat-1", value: "12", label: "years at the table" },
  { _id: "stat-2", value: "600+", label: "pieces made" },
  { _id: "stat-3", value: "100%", label: "repaired for free" },
];

export async function PinkHomepage({ business }: DefaultHomepageTemplateProps) {
  const rawCustomFields = business.siteContent?.customFields;
  const customFields = rawCustomFields as Record<string, unknown> | undefined;
  const f = resolveFields(rawCustomFields, FIELD_KEYS);

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

  const eventsCardsRaw = parseTemplateListRows(customFields?.["pink.homepage.events-cards"]);
  const eventsCards = eventsCardsRaw.length > 0 ? eventsCardsRaw : DEFAULT_EVENTS_CARDS;

  const storyStatsRaw = parseTemplateListRows(customFields?.["pink.homepage.story-stats"]);
  const storyStats = storyStatsRaw.length > 0 ? storyStatsRaw : DEFAULT_STORY_STATS;

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
  const collectionChips: PinkFilterChipItem[] = [
    { id: "all", label: "All pieces", href: "/shop" },
    ...collections.slice(0, 4).map((c) => ({ id: c.id, label: c.name, href: `/collections/${c.slug}` })),
  ];

  return (
    <HydrateClient>
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
            eyebrow={f["pink.homepage.collection-eyebrow"] ?? ""}
            heading={f["pink.homepage.collection-heading"] ?? ""}
            note={f["pink.homepage.collection-note"] ?? ""}
            ctaLabel={f["pink.homepage.collection-cta-label"] ?? ""}
            ctaLink={f["pink.homepage.collection-cta-link"] ?? "/shop"}
            products={products}
            collectionChips={collectionChips}
          />
        )}

        {isSectionVisible(customFields, "pink", "homepage.events") && (
          <PinkEventsSection
            eyebrow={f["pink.homepage.events-eyebrow"] ?? ""}
            heading={f["pink.homepage.events-heading"] ?? ""}
            note={f["pink.homepage.events-note"] ?? ""}
            mosaic={eventsMosaic}
            cards={eventsCards}
          />
        )}

        {isSectionVisible(customFields, "pink", "homepage.story") && (
          <PinkStorySection
            image={f["pink.homepage.story-image"] ?? "/placeholder.svg"}
            imageAlt={f["pink.homepage.story-image-alt"] ?? ""}
            eyebrow={f["pink.homepage.story-eyebrow"] ?? ""}
            quoteBefore={f["pink.homepage.story-quote-before"] ?? ""}
            quoteAccent={f["pink.homepage.story-quote-accent"] ?? ""}
            quoteAfter={f["pink.homepage.story-quote-after"] ?? ""}
            body={f["pink.homepage.story-body"] ?? ""}
            stats={storyStats}
          />
        )}
      </PageTransition>
    </HydrateClient>
  );
}
