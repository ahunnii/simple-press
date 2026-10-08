import type { DefaultHomepageTemplateProps } from "../../types";
import type { GloveStoryVideo } from "./glove-home-story";
import type { Product } from "~/types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { resolvePopup } from "~/lib/site-banner/resolve";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateIframeValue } from "~/lib/template-fields";
import { parseYouTubeVideoId } from "~/lib/youtube/parse";
import { api, HydrateClient } from "~/trpc/server";

import { resolveFields } from "..";
import { gloveLinkAllowed } from "../steps/glove-links";
import { resolveGloveListRows } from "../steps/glove-list-rows";
import { GloveSteps } from "../steps/glove-steps";
import { resolveGloveStepsFields } from "../steps/glove-steps-data";
import { GloveHomeCharms } from "./glove-home-charms";
import { GloveHomeCollections } from "./glove-home-collections";
import { GloveHomeFeatured } from "./glove-home-featured";
import { GloveHomeGift } from "./glove-home-gift";
import { GloveHomeHero } from "./glove-home-hero";
import { GloveHomePromise } from "./glove-home-promise";
import { GloveHomeSorority } from "./glove-home-sorority";
import { GloveHomeStory } from "./glove-home-story";
import { GloveHomeStyles } from "./glove-home-styles";
import { GloveHomeVip } from "./glove-home-vip";
import { GlovePopup } from "./glove-popup";
import {
  GLOVE_COLLECTIONS_DEFAULT_ROWS,
  GLOVE_PROMISE_DEFAULT_ROWS,
  GLOVE_STYLES_DEFAULT_ROWS,
} from "./index";

const FIELD_KEYS = [
  "glove.homepage.hero-image",
  "glove.homepage.hero-image-alt",
  "glove.homepage.hero-heading",
  "glove.homepage.hero-subheading",
  "glove.homepage.hero-button-label",
  "glove.homepage.hero-button-url",
  "glove.homepage.styles-heading",
  "glove.homepage.story-overline",
  "glove.homepage.story-heading",
  "glove.homepage.story-video",
  "glove.homepage.story-body-1",
  "glove.homepage.story-body-2",
  "glove.homepage.story-signoff-name",
  "glove.homepage.story-signoff-role",
  "glove.homepage.story-button-label",
  "glove.homepage.story-button-url",
  "glove.homepage.gift-image",
  "glove.homepage.gift-image-alt",
  "glove.homepage.gift-heading",
  "glove.homepage.gift-body",
  "glove.homepage.gift-button-label",
  "glove.homepage.gift-button-url",
  "glove.homepage.collections-heading",
  "glove.homepage.collections-intro",
  "glove.homepage.featured-heading",
  "glove.homepage.charms-heading",
  "glove.homepage.charms-collection-slug",
  "glove.homepage.sorority-image",
  "glove.homepage.sorority-image-alt",
  "glove.homepage.sorority-heading",
  "glove.homepage.sorority-body",
  "glove.homepage.sorority-button-label",
  "glove.homepage.sorority-button-url",
  "glove.homepage.vip-heading",
  "glove.homepage.vip-body",
  "glove.homepage.vip-note",
  "glove.homepage.vip-button-label",
  "glove.homepage.vip-button-url",
];

/** Most products the "Gloves Crafted with Love" band shows. */
const FEATURED_MAX = 5;
/** Stable sort: purchasable products lead the band, sold-out ones trail. */
function availableFirst(products: Product[]): Product[] {
  const soldOut = (p: Product) =>
    checkProductStatus({
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      trackInventory: p.trackInventory,
      inventoryQty: p.inventoryQty,
      allowBackorders: p.allowBackorders,
      baseInventoryUnit: p.baseInventoryUnit
        ? { inventoryQty: p.baseInventoryUnit.inventoryQty }
        : null,
      baseUnitsConsumed: p.baseUnitsConsumed,
      additionalFields: p.additionalFields,
      variants: p.variants.map((v) => ({
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        inventoryQty: v.inventoryQty,
      })),
    }).isOutOfStock;
  return [...products].sort((a, b) => Number(soldOut(a)) - Number(soldOut(b)));
}

/** Fewer featured products than this are topped up with the newest. */
const FEATURED_MIN = 4;

/** The story video as a renderable value, or null (hides the video). */
function resolveStoryVideo(raw: string): GloveStoryVideo | null {
  const parsed = parseTemplateIframeValue(raw);
  if (!parsed) return null;
  const youtubeId = parseYouTubeVideoId(parsed.src);
  if (youtubeId) {
    return { kind: "youtube", youtubeId, title: parsed.title };
  }
  return {
    kind: "embed",
    src: parsed.src,
    title: parsed.title,
    height: parsed.height,
  };
}

/**
 * The LuvGluv homepage: hero, glove styles, founder story, six easy steps,
 * gift cards, collections, featured gloves, promise strip, charms, sorority
 * and the VIP list (design.md "Per-page section concepts › Homepage").
 *
 * Every section except the hero is hideable. Sections that depend on store
 * data (featured gloves, charms) and on feature flags (VIP list needs
 * customer accounts) hide themselves when there is nothing honest to show.
 * Links to a switched-off feature are dropped, never redirected (B2.5).
 */
export async function GloveHomepage({
  business,
}: DefaultHomepageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const { isEnabled } = await getBusinessFlags();
  const popup = resolvePopup(business.siteContent, isEnabled("popups"));

  const f = resolveFields(customFields, FIELD_KEYS);
  const field = (key: string): string => f[`glove.homepage.${key}`] ?? "";
  const link = (key: string): string => {
    const href = field(key);
    return gloveLinkAllowed(href, isEnabled) ? href : "";
  };

  const show = (group: string) =>
    isSectionVisible(customFields, "glove", `homepage.${group}`);
  const productsEnabled = isEnabled("products");

  // ── Remote reads: each is flag-gated server side and may throw, so every
  // one is caught; one failing read must never take the homepage down. ─────
  const showFeatured = show("featured") && productsEnabled;
  const charmsSlug = field("charms-collection-slug").trim();
  const showCharms =
    show("charms") &&
    productsEnabled &&
    isEnabled("collections") &&
    charmsSlug !== "";

  const [featuredProducts, charmsCollection] = await Promise.all([
    showFeatured
      ? (async (): Promise<Product[]> => {
          const featured: Product[] = await api.product
            .getRailProducts({ featuredOnly: true, limit: FEATURED_MAX })
            .catch(() => []);
          if (featured.length >= FEATURED_MIN) return availableFirst(featured);
          // Top up with the newest products, never repeating a featured one.
          const newest: Product[] = await api.product
            .getRailProducts({ limit: 12 })
            .catch(() => []);
          const taken = new Set(featured.map((p) => p.id));
          const extra = newest.filter((p) => !taken.has(p.id));
          return availableFirst([...featured, ...extra]).slice(0, FEATURED_MAX);
        })()
      : Promise.resolve([] as Product[]),
    showCharms
      ? api.collections.getBySlug(charmsSlug).catch(() => null)
      : Promise.resolve(null),
  ]);

  const charmProducts: Product[] =
    charmsCollection?.collectionProducts.map((cp) => cp.product) ?? [];

  // ── List fields ─────────────────────────────────────────────────────────
  const styleEntries = resolveGloveListRows(
    customFields,
    "glove.homepage.styles-list",
    GLOVE_STYLES_DEFAULT_ROWS,
    "style",
  )
    .map((row, index) => ({
      id: row._id,
      index,
      name: row.name ?? "",
      blurb: row.blurb ?? "",
      image: row.image ?? "",
      imageAlt: row.imageAlt ?? "",
      buttonLabel: row.buttonLabel ?? "",
      href: row.url && row.url !== "" ? row.url : "/shop",
    }))
    .filter(
      (entry) => entry.name !== "" && gloveLinkAllowed(entry.href, isEnabled),
    );

  const collectionCards = resolveGloveListRows(
    customFields,
    "glove.homepage.collections-list",
    GLOVE_COLLECTIONS_DEFAULT_ROWS,
    "collection",
  )
    .map((row, index) => ({
      id: row._id,
      index,
      heading: row.heading ?? "",
      body: row.body ?? "",
      image: row.image ?? "",
      imageAlt: row.imageAlt ?? "",
      linkLabel: row.linkLabel ?? "",
      linkUrl: gloveLinkAllowed(row.linkUrl ?? "", isEnabled)
        ? (row.linkUrl ?? "")
        : "",
    }))
    .filter((card) => card.heading !== "");

  const promiseItems = resolveGloveListRows(
    customFields,
    "glove.homepage.promise-list",
    GLOVE_PROMISE_DEFAULT_ROWS,
    "promise",
  )
    .map((row, index) => ({
      id: row._id,
      index,
      icon: row.icon ?? "",
      title: row.title ?? "",
      detail: row.detail ?? "",
    }))
    .filter((item) => item.title !== "");

  const steps = resolveGloveStepsFields(customFields, isEnabled);

  return (
    <HydrateClient>
      {popup ? <GlovePopup popup={popup} /> : null}

      <GloveHomeHero
        image={field("hero-image")}
        imageAlt={field("hero-image-alt")}
        heading={field("hero-heading")}
        subheading={field("hero-subheading")}
        buttonLabel={field("hero-button-label")}
        buttonUrl={link("hero-button-url")}
        sectionAttrs={sectionGroupAttr("homepage", "hero")}
      />

      {show("styles") ? (
        <GloveHomeStyles
          heading={field("styles-heading")}
          entries={styleEntries}
          sectionAttrs={sectionGroupAttr("homepage", "styles")}
        />
      ) : null}

      {show("story") ? (
        <GloveHomeStory
          overline={field("story-overline")}
          heading={field("story-heading")}
          video={resolveStoryVideo(field("story-video"))}
          bodyOne={field("story-body-1")}
          bodyTwo={field("story-body-2")}
          signoffName={field("story-signoff-name")}
          signoffRole={field("story-signoff-role")}
          buttonLabel={field("story-button-label")}
          buttonUrl={link("story-button-url")}
          sectionAttrs={sectionGroupAttr("homepage", "story")}
        />
      ) : null}

      {show("steps") ? (
        <GloveSteps
          fields={steps}
          showStepButtons={false}
          headingAs="h2"
          sectionAttrs={sectionGroupAttr("homepage", "steps")}
        />
      ) : null}

      {show("gift") ? (
        <GloveHomeGift
          image={field("gift-image")}
          imageAlt={field("gift-image-alt")}
          heading={field("gift-heading")}
          body={field("gift-body")}
          buttonLabel={field("gift-button-label")}
          buttonUrl={link("gift-button-url")}
          sectionAttrs={sectionGroupAttr("homepage", "gift")}
        />
      ) : null}

      {show("collections") ? (
        <GloveHomeCollections
          heading={field("collections-heading")}
          intro={field("collections-intro")}
          cards={collectionCards}
          sectionAttrs={sectionGroupAttr("homepage", "collections")}
        />
      ) : null}

      {showFeatured ? (
        <GloveHomeFeatured
          heading={field("featured-heading")}
          products={featuredProducts}
          sectionAttrs={sectionGroupAttr("homepage", "featured")}
        />
      ) : null}

      {show("promise") ? (
        <GloveHomePromise
          items={promiseItems}
          sectionAttrs={sectionGroupAttr("homepage", "promise")}
        />
      ) : null}

      {showCharms ? (
        <GloveHomeCharms
          heading={field("charms-heading")}
          category={charmsCollection?.name ?? ""}
          products={charmProducts}
          sectionAttrs={sectionGroupAttr("homepage", "charms")}
        />
      ) : null}

      {show("sorority") ? (
        <GloveHomeSorority
          image={field("sorority-image")}
          imageAlt={field("sorority-image-alt")}
          heading={field("sorority-heading")}
          body={field("sorority-body")}
          buttonLabel={field("sorority-button-label")}
          buttonUrl={link("sorority-button-url")}
          sectionAttrs={sectionGroupAttr("homepage", "sorority")}
        />
      ) : null}

      {show("vip") && isEnabled("customerAccounts") ? (
        <GloveHomeVip
          heading={field("vip-heading")}
          body={field("vip-body")}
          note={field("vip-note")}
          buttonLabel={field("vip-button-label")}
          buttonUrl={link("vip-button-url")}
          sectionAttrs={sectionGroupAttr("homepage", "vip")}
        />
      ) : null}
    </HydrateClient>
  );
}
