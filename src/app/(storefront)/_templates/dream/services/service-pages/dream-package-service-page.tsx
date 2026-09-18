/**
 * `dream-package` — hero, intro, a tier grid of package cards built from
 * this service's `ServiceItem`s, a "How to choose" band, and a closing
 * Estimate Quote band (design.md "Service-page variants → dream-package").
 * No pricing/booking fields render here — matches the services index
 * "Package ideas" no-prices convention; each `ServiceItem` here is a
 * described package, not a priced line item.
 *
 * Fields live on `Service.customFields`, edited at `/admin/services/[id]` —
 * NOT the visual editor (there is no `sections.ts` entry for a service
 * detail page), so this file has no `sectionGroupAttr`/`fieldAttr`/
 * `isSectionVisible` calls. Mirrors wealth's/vii's per-service-template
 * pages (see `wealth-essay-service-page.tsx`).
 */
import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { parseServiceAddOns } from "~/lib/validators/services";

import { DreamHeading } from "../../shared/dream-heading";
import { DreamPageHero } from "../../shared/dream-page-hero";
import { DreamPhoto } from "../../shared/dream-photo";
import { DreamQuoteCta } from "../../shared/dream-quote-cta";
import { DreamRevealGroup } from "../../shared/dream-reveal";
import { DreamSection } from "../../shared/dream-section";
import { DreamMostLovedBadge } from "../dream-most-loved-badge";
import { resolveDreamPackageFields } from "./fields";

const FIELD_KEYS = [
  "dream-package.intro",
  "dream-package.grid-heading",
  "dream-package.how-to-choose-heading",
  "dream-package.how-to-choose-1",
  "dream-package.how-to-choose-2",
  "dream-package.how-to-choose-3",
  "dream-package.cta-heading",
  "dream-package.cta-accent",
  "dream-package.cta-lede",
  "dream-package.cta-label",
  "dream-package.cta-url",
];

function PackageTierCard({
  item,
  index,
}: {
  item: ServiceTemplateProps["items"][number];
  index: number;
}) {
  const inclusions = (item.description ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const addOns = parseServiceAddOns(item.addOns);

  return (
    <div
      className="dream-card dream-reveal-item flex h-full flex-col gap-4"
      style={{ "--i": Math.min(index, 7) } as React.CSSProperties}
    >
      <div className="relative">
        <DreamPhoto
          src={item.image ?? "/placeholder.svg"}
          alt={item.name}
          aspect="4 / 3"
        />
        {item.isSignature && <DreamMostLovedBadge />}
      </div>

      <h3 className="dream-heading">{item.name}</h3>

      {inclusions.length > 0 && (
        <ul className="flex flex-col gap-2 text-[15px] leading-snug text-[var(--dream-ink)]">
          {inclusions.map((line, i) => (
            <li key={i} className="flex items-baseline gap-2">
              <span
                aria-hidden="true"
                className="mt-[2px] inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-[var(--dream-gold)]"
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {addOns.length > 0 && (
        <div className="mt-auto flex flex-col gap-2 border-t border-[var(--dream-line)] pt-3">
          <p className="text-[13px] font-medium text-[var(--dream-gold-ink)]">
            Add-ons
          </p>
          <div className="flex flex-wrap gap-1.5">
            {addOns.map((addOn, i) => (
              <span
                key={i}
                className="rounded-full bg-[var(--dream-sky)] px-3 py-1 text-[12px] text-[var(--dream-ink)]"
              >
                {addOn.name}
                {addOn.priceLabel ? ` · ${addOn.priceLabel}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DreamPackageServicePage({
  business,
  service,
  items,
}: ServiceTemplateProps) {
  const f = resolveDreamPackageFields(service.customFields, FIELD_KEYS);

  const logoUrl =
    business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    business.name ?? "",
  );

  const publishedItems = items.filter((item) => item.published !== false);

  const howToChoose = [1, 2, 3]
    .map((n) => f[`dream-package.how-to-choose-${n}`] ?? "")
    .filter((paragraph) => paragraph.trim().length > 0);

  const hasGridHeading = (f["dream-package.grid-heading"] ?? "").length > 0;
  const hasIntro = (f["dream-package.intro"] ?? "").length > 0;

  return (
    <article>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={service.name}
        lede={service.description ?? ""}
      />

      {(hasGridHeading || hasIntro || publishedItems.length > 0) && (
        <DreamSection tone="sky">
          {hasGridHeading ? (
            <DreamHeading as="h2" className="mb-6 text-center">
              {f["dream-package.grid-heading"]}
            </DreamHeading>
          ) : null}
          {hasIntro && (
            <p className="mx-auto mb-10 max-w-[66ch] text-center text-[17px] leading-relaxed text-[var(--dream-soft)]">
              {f["dream-package.intro"]}
            </p>
          )}
          {publishedItems.length > 0 && (
            <>
              {/* auto-fit + a max card width centers short rows instead of
                  left-aligning them with an orphan gap on the right —
                  finish-review "Package variant + Options grid". */}
              <style>{`
                .dream-package-tier-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(280px, 380px));
                  justify-content: center;
                  gap: clamp(20px, 3vw, 28px);
                }
              `}</style>
              <DreamRevealGroup
                className="dream-package-tier-grid"
                threshold={0.05}
              >
                {publishedItems.map((item, i) => (
                  <PackageTierCard key={item.id} item={item} index={i} />
                ))}
              </DreamRevealGroup>
            </>
          )}
        </DreamSection>
      )}

      {howToChoose.length > 0 && (
        <DreamSection contained>
          <div className="mx-auto max-w-[66ch]">
            <DreamHeading as="h2" className="!mb-6">
              {f["dream-package.how-to-choose-heading"] ?? ""}
            </DreamHeading>
            <div className="flex flex-col gap-4">
              {howToChoose.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-[17px] leading-relaxed text-[var(--dream-soft)]"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </DreamSection>
      )}

      <DreamQuoteCta
        heading={f["dream-package.cta-heading"] ?? ""}
        accent={f["dream-package.cta-accent"] ?? ""}
        lede={f["dream-package.cta-lede"] ?? ""}
        ctaLabel={f["dream-package.cta-label"] ?? ""}
        ctaUrl={f["dream-package.cta-url"] ?? "/contact"}
      />
    </article>
  );
}
