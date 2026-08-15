import type { RelocationIconRow } from "../homepage";
import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { getListFieldValue } from "~/lib/template-fields";

import { resolveFields } from "..";
import { DEFAULT_RELOCATION_SERVICES } from "../homepage";
import { toRelocationIconRows } from "../homepage/rows";
import { RelocationCredentialsBand } from "../shared/relocation-credentials-band";
import { relocationTelHref } from "../shared/relocation-phone";
import { RelocationRevealGroup } from "../shared/relocation-reveal";
import { RelocationWaveHero } from "../shared/relocation-wave-hero";

type Business = NonNullable<RouterOutputs["business"]["simplifiedGet"]>;

/**
 * One service card — illustrated badge left, terracotta-red title + bold blurb
 * right. Intentionally the same markup as the homepage's `ServiceRow`
 * (`../homepage/relocation-services-section.tsx`), because both render the
 * same shared list field and the two pages must look identical; the local copy
 * exists only because that component hardcodes the homepage's
 * `sectionGroupAttr` and is not exported.
 *
 * The badge is a plain object-contain image element, NOT
 * `RelocationCircleImage`: the ring is already baked into the illustration and
 * the source assets are not square (707×677, 731×705, …), so the circle
 * primitive's `aspect-square` + `object-cover` would crop the ring top and
 * bottom.
 *
 * Heading level is `h2` here (not the homepage's `h3`) — on `/services` these
 * titles are the page's top-level content headings under the hero `h1`.
 */
function RelocationServiceCard({
  row,
  index,
}: {
  row: RelocationIconRow;
  index: number;
}) {
  return (
    <div
      className="relocation-reveal-item flex items-center gap-5 min-[1025px]:gap-7"
      style={{ ["--i" as string]: Math.min(index, 7) }}
    >
      {row.image !== "" ? (
        <img
          src={row.image}
          alt={row.alt}
          width={140}
          height={140}
          loading="lazy"
          decoding="async"
          className="block w-[6rem] shrink-0 object-contain min-[1025px]:w-[8.3125rem]"
        />
      ) : null}

      <div className="min-w-0">
        <h2 className="[font-family:var(--font-relocation-display)] text-[1.5rem] leading-[1.9rem] font-semibold text-[var(--relocation-red)] min-[1025px]:text-[1.6875rem] min-[1025px]:leading-[2.1rem]">
          {row.title}
        </h2>
        {row.text !== "" ? (
          <p className="mt-3 [font-family:var(--font-relocation-body)] text-base leading-[1.625rem] font-bold text-[var(--relocation-ink)] min-[1025px]:mt-4 min-[1025px]:text-[1.125rem] min-[1025px]:leading-[1.8125rem]">
            {row.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * `ServicesPage` — the LEGACY services slot (design.md → Scope: the `services`
 * feature flag stays OFF for this template; `ServicesIndexPage` and the
 * injected DB services are never used here, matching `pollen-services-page.tsx`,
 * the only other implementer of this slot).
 *
 * Ground truth: `docs/relocation/"Services _ Handy Relocations.jpeg"` — the
 * Services page was never cloned live, so the screenshot is the sole source
 * for this layout (design.md → "GROUND TRUTH IMAGE").
 *
 * Sections: wave hero (headline + blurb + CALL US TODAY + circular van photo)
 * → 5 service cards in a 2-col icon-ring grid (shared list field, see
 * `./index.ts`) → shared credentials band.
 */
export function RelocationServicesPage({ business }: { business: Business }) {
  const customFields = business?.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "relocation.services.hero-heading",
    "relocation.services.hero-subheading",
    "relocation.global.branding.hero-cta-label",
    "relocation.services.hero-image",
    "relocation.services.hero-image-alt",
  ]);

  const heroImage = f["relocation.services.hero-image"] ?? "";
  const ctaHref = relocationTelHref(business?.phoneNumber ?? "");
  const ctaLabel =
    ctaHref === ""
      ? ""
      : (f["relocation.global.branding.hero-cta-label"] ?? "");

  // Shared with the homepage "Services" section (design.md → homepage §3) —
  // read via the literal key since the field itself is defined in the
  // homepage module, not here (see ./index.ts's module doc comment). Parser
  // and fallback rows come from that same module so the two pages can never
  // drift apart.
  const services = toRelocationIconRows(
    getListFieldValue(customFields, "relocation.homepage.services-list"),
    DEFAULT_RELOCATION_SERVICES,
  );

  // The screenshot fills the grid COLUMN-first (left: Local Moving / Packing /
  // Labor Only · right: Full Service / Furniture Pick Up), which is also how
  // the homepage section splits the very same rows — so the split is computed
  // here instead of relying on a row-major `grid-cols-2`, whose visual order
  // would silently change the moment an owner saves the list.
  const splitAt = Math.ceil(services.length / 2);
  const leftColumn = services.slice(0, splitAt);
  const rightColumn = services.slice(splitAt);

  return (
    <>
      <RelocationWaveHero
        title={f["relocation.services.hero-heading"] ?? ""}
        subtitle={f["relocation.services.hero-subheading"] ?? ""}
        ctaLabel={ctaLabel}
        ctaHref={ctaHref}
        photoSrc={heroImage === "" ? undefined : heroImage}
        photoAlt={f["relocation.services.hero-image-alt"] ?? ""}
        size="tall"
        sectionAttrs={sectionGroupAttr("services", "hero")}
        titleFieldAttrs={fieldAttr("relocation.services.hero-heading")}
        subtitleFieldAttrs={fieldAttr("relocation.services.hero-subheading")}
        ctaFieldAttrs={fieldAttr("relocation.global.branding.hero-cta-label")}
      />

      {/* Service cards — 2-col icon-ring grid (design.md → "Services" §2).
          No `sectionGroupAttr` here on purpose: the content belongs to the
          homepage's `homepage.services` group (see ./index.ts doc comment),
          so this section is only editable from the Homepage tab — same
          pattern as vii's shop page reusing the homepage brand marquee. */}
      {services.length > 0 ? (
        <section
          aria-label="Our services"
          className="w-full bg-[var(--relocation-paper)] py-16 min-[1025px]:py-24"
        >
          <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
            <RelocationRevealGroup className="grid gap-y-12 min-[1025px]:grid-cols-2 min-[1025px]:gap-x-16">
              <div className="flex flex-col gap-12">
                {leftColumn.map((row, i) => (
                  <RelocationServiceCard
                    key={`${row.title}-${i}`}
                    row={row}
                    index={i}
                  />
                ))}
              </div>

              {rightColumn.length > 0 ? (
                <div className="flex flex-col gap-12">
                  {rightColumn.map((row, i) => (
                    <RelocationServiceCard
                      key={`${row.title}-${splitAt + i}`}
                      row={row}
                      index={splitAt + i}
                    />
                  ))}
                </div>
              ) : null}
            </RelocationRevealGroup>
          </div>
        </section>
      ) : null}

      <RelocationCredentialsBand customFields={customFields} />
    </>
  );
}
