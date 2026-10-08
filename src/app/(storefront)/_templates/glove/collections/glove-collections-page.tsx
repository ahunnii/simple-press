import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import {
  GloveBreadcrumb,
  GloveButton,
  GloveRevealGroup,
  gloveRevealItemStyle,
  GloveSection,
  GloveStyleCard,
  GloveTitleBand,
} from "../shared";
import { GloveHandIcon } from "../shared/glove-hand-icon";
import { gloveCollectionsData } from "./index";

/**
 * GloveCollectionsPage (design.md Collections, extrapolated): navy title
 * band, then every published collection as a homepage-style card — 200px
 * circle photo, Poppins name, "{n} Products", small purple button. The route
 * already returns published collections only (counts exclude drafts).
 */
export async function GloveCollectionsPage({
  collections,
  business,
}: DefaultCollectionsPageTemplateProps) {
  const f = resolveFields(
    business.siteContent?.customFields,
    gloveCollectionsData.map((field) => field.key),
  );
  const get = (key: string) => f[key] ?? "";
  const buttonLabel = get("glove.collections.button-label");
  const { isEnabled } = await getBusinessFlags();
  // The empty-state button goes to /shop, which 404s with products off.
  const emptyButton = isEnabled("products")
    ? get("glove.collections.empty-button-label")
    : "";

  return (
    <>
      <GloveTitleBand
        title={get("glove.collections.heading")}
        titleFieldKey="glove.collections.heading"
        subtitle={get("glove.collections.intro")}
        subtitleFieldKey="glove.collections.intro"
        sectionAttrs={sectionGroupAttr("collections", "hero")}
      />

      <GloveSection
        aria-label="All collections"
        sectionAttrs={sectionGroupAttr("collections", "grid")}
        reveal={false}
      >
        <div className="mb-8 border-b border-[var(--glove-line)] pb-4 md:mb-10">
          <GloveBreadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: get("glove.collections.heading") },
            ]}
          />
        </div>
        {collections.length === 0 ? (
          <div className="glove-mist-panel mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-12 text-center md:py-16">
            <span className="inline-flex size-24 items-center justify-center rounded-full bg-[var(--glove-paper)] text-[var(--glove-primary)] shadow-[var(--glove-shadow-sm)]">
              <GloveHandIcon className="size-14" />
            </span>
            <h2
              className="glove-display m-0 text-[clamp(22px,2.6vw,28px)] font-medium text-[var(--glove-ink)]"
              {...fieldAttr("glove.collections.empty-heading")}
            >
              {get("glove.collections.empty-heading")}
            </h2>
            <p
              className="m-0 max-w-[52ch] text-[15px] leading-relaxed text-[var(--glove-text)]"
              {...fieldAttr("glove.collections.empty-body")}
            >
              {get("glove.collections.empty-body")}
            </p>
            {emptyButton ? (
              <GloveButton
                href="/shop"
                variant="woo"
                className="mt-2"
                {...fieldAttr("glove.collections.empty-button-label")}
              >
                {emptyButton}
              </GloveButton>
            ) : null}
          </div>
        ) : (
          <GloveRevealGroup threshold={0}>
            {/* Card names are h3s; keep the outline h1 → h2 → h3. */}
            <h2 className="sr-only">All collections</h2>
            <ul className="m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-12 p-0 [&>li]:w-[calc(50%-0.5rem)] md:[&>li]:w-[calc(33.333%-0.667rem)] lg:[&>li]:w-[calc(25%-0.75rem)]">
              {collections.map((collection, i) => {
                const count = collection._count.collectionProducts;
                return (
                  <li
                    key={collection.id}
                    className="glove-reveal-item"
                    style={gloveRevealItemStyle(i % 8)}
                  >
                    <GloveStyleCard
                      name={collection.name}
                      blurb={`${count} ${count === 1 ? "Product" : "Products"}`}
                      image={collection.imageUrl ?? "/placeholder.svg"}
                      href={`/collections/${collection.slug}`}
                      buttonLabel={buttonLabel}
                      size={200}
                    />
                  </li>
                );
              })}
            </ul>
          </GloveRevealGroup>
        )}
      </GloveSection>
    </>
  );
}
