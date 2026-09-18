import type { DefaultProductsPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
import { api } from "~/trpc/server";

import { UMSC_SHOP_DEFAULT_DOORS } from ".";
import { resolveFields } from "..";
import { UmscCollectionDoor } from "../shared/umsc-collection-door";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";
import { UmscShopClient } from "./umsc-shop-client";

const FIELD_KEYS = [
  "umsc.shop.hero-heading",
  "umsc.shop.hero-lede",
  "umsc.shop.empty-heading",
  "umsc.shop.empty-body",
  "umsc.shop.empty-link-label",
];

/**
 * UmscShopPage — design.md "Shop". Server half resolves fields + the door
 * row's data source (real collections, else the `shop.doors` fallback list),
 * then hands off filtering/sorting/pagination to `UmscShopClient`
 * (server → client handoff, per `useShopFilters`'s "use client" requirement).
 */
export async function UmscShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  const { isEnabled } = await getBusinessFlags();
  const collections = isEnabled("collections")
    ? await api.collections.getAllPublic()
    : [];
  const products = (business.products ?? []) as unknown as Product[];

  const doorsVisible = isSectionVisible(customFields, "umsc", "shop.doors");
  const fallbackDoors = parseTemplateListRows(
    customFields?.["umsc.shop.doors"],
  );
  const doors =
    fallbackDoors.length > 0 ? fallbackDoors : UMSC_SHOP_DEFAULT_DOORS;

  return (
    <div>
      <UmscPageHero
        heading={f["umsc.shop.hero-heading"] ?? ""}
        headingFieldKey="umsc.shop.hero-heading"
        lede={f["umsc.shop.hero-lede"] ?? ""}
        ledeFieldKey="umsc.shop.hero-lede"
        sectionAttrs={sectionGroupAttr("shop", "hero")}
      />

      {doorsVisible && (
        <UmscSection
          tone="paper"
          aria-label="Shop by product type"
          sectionAttrs={sectionGroupAttr("shop", "doors")}
          className="border-b border-[var(--umsc-line)]"
          style={{ padding: "2.5rem var(--umsc-section-pad-x)" }}
        >
          <h2 className="sr-only">Shop by product type</h2>
          <UmscRevealGroup className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {collections.length > 0
              ? collections.slice(0, 4).map((collection, i) => (
                  <div
                    key={collection.id}
                    className="umsc-reveal-item"
                    style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
                  >
                    <UmscCollectionDoor
                      href={`/collections/${collection.slug}`}
                      title={collection.name}
                      blurb={collection.description ?? undefined}
                      image={collection.imageUrl ?? undefined}
                      aspect="3 / 2"
                    />
                  </div>
                ))
              : doors.map((door, i) => {
                  const title =
                    typeof door.title === "string" ? door.title : "";
                  const blurb =
                    typeof door.blurb === "string" ? door.blurb : "";
                  const link =
                    typeof door.link === "string" && door.link
                      ? door.link
                      : "/shop";
                  const image =
                    typeof door.image === "string" ? door.image : "";
                  return (
                    <div
                      key={
                        typeof door._id === "string" ? door._id : `door-${i}`
                      }
                      className="umsc-reveal-item"
                      style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
                    >
                      <UmscCollectionDoor
                        href={link}
                        title={title}
                        blurb={blurb || undefined}
                        image={image || undefined}
                        aspect="3 / 2"
                      />
                    </div>
                  );
                })}
          </UmscRevealGroup>
        </UmscSection>
      )}

      <UmscShopClient
        products={products}
        sectionAttrs={sectionGroupAttr("shop", "grid")}
        emptyHeading={f["umsc.shop.empty-heading"] ?? ""}
        emptyHeadingFieldKey="umsc.shop.empty-heading"
        emptyBody={f["umsc.shop.empty-body"] ?? ""}
        emptyBodyFieldKey="umsc.shop.empty-body"
        emptyLinkLabel={f["umsc.shop.empty-link-label"] ?? ""}
        emptyLinkLabelFieldKey="umsc.shop.empty-link-label"
      />
    </div>
  );
}
