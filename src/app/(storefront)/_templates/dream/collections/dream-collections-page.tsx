import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { navHrefOffFlag } from "~/app/(storefront)/_components/nav";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { DreamButton } from "../shared/dream-button";
import { DreamHeading } from "../shared/dream-heading";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamSection } from "../shared/dream-section";
import { DreamCollectionCard } from "./dream-collection-card";

const FIELD_KEYS = [
  "dream.collections.hero-heading",
  "dream.collections.hero-accent",
  "dream.collections.hero-lede",
  "dream.collections.grid-empty-heading",
  "dream.collections.grid-empty-body",
  "dream.collections.grid-empty-cta-label",
  "dream.collections.grid-empty-cta-url",
];

/**
 * `/collections` — grid of every published collection on `DreamPageHero` +
 * the dream container (parity-plan-2026-09-28 PF18). No template fields for
 * `collections.detail` — that's `CollectionPage`'s below.
 */
export async function DreamCollectionsPage({
  collections,
  business,
}: DefaultCollectionsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);

  const logoUrl =
    business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    business.name ?? "",
  );

  const list = collections ?? [];

  // TP6 contract: the empty-state shop link must hide (never swap
  // destination) when the `products` flag it names is off.
  const { isEnabled } = await getBusinessFlags();
  const emptyCtaUrlRaw = f["dream.collections.grid-empty-cta-url"] ?? "";
  const emptyCtaFlag = navHrefOffFlag(emptyCtaUrlRaw, isEnabled);
  const showEmptyCta =
    emptyCtaUrlRaw !== "" &&
    (emptyCtaFlag === null || isEnabled(emptyCtaFlag)) &&
    (f["dream.collections.grid-empty-cta-label"] ?? "").trim() !== "";

  return (
    <>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={f["dream.collections.hero-heading"] ?? ""}
        accent={f["dream.collections.hero-accent"] ?? ""}
        lede={f["dream.collections.hero-lede"] ?? ""}
        titleFieldKey="dream.collections.hero-heading"
        accentFieldKey="dream.collections.hero-accent"
        ledeFieldKey="dream.collections.hero-lede"
        sectionAttrs={sectionGroupAttr("collections", "hero")}
      />

      <DreamSection
        sectionAttrs={sectionGroupAttr("collections", "grid")}
        aria-label="Collections"
      >
        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <DreamHeading
              as="h2"
              fieldKey="dream.collections.grid-empty-heading"
            >
              {f["dream.collections.grid-empty-heading"] ?? ""}
            </DreamHeading>
            {f["dream.collections.grid-empty-body"] ? (
              <p
                {...fieldAttr("dream.collections.grid-empty-body")}
                className="max-w-[60ch] text-[16px] leading-relaxed text-[var(--dream-soft)]"
              >
                {f["dream.collections.grid-empty-body"]}
              </p>
            ) : null}
            {showEmptyCta ? (
              <DreamButton href={emptyCtaUrlRaw} variant="primary" className="mt-2">
                <span {...fieldAttr("dream.collections.grid-empty-cta-label")}>
                  {f["dream.collections.grid-empty-cta-label"]}
                </span>
              </DreamButton>
            ) : null}
          </div>
        ) : (
          <>
            <p className="mb-10 text-[14px] text-[var(--dream-soft)] tabular-nums">
              {list.length} {list.length === 1 ? "collection" : "collections"}
            </p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((collection) => (
                <DreamCollectionCard
                  key={collection.id}
                  collection={collection}
                />
              ))}
            </div>
          </>
        )}
      </DreamSection>
    </>
  );
}
