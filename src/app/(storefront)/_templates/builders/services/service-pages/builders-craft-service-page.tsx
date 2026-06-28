import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveCraftFields } from "./fields";

/**
 * BuildersCraftServicePage
 *
 * Industrial Solidarity per-service detail page for the `builders` template.
 *
 * Layout:
 * 1. Hero — H1 = service.name, optional bordered intro paragraph = service.description
 * 2. Sub-Services — two-column grid of published ServiceItems (name + description only)
 * 3. CTA — centered heading + accent button (fields: builders-craft.cta-*)
 */
export function BuildersCraftServicePage({
  service,
  items,
}: ServiceTemplateProps) {
  const f = resolveCraftFields(service.customFields, [
    "builders-craft.cta-heading",
    "builders-craft.cta-button-label",
    "builders-craft.cta-button-href",
  ]);

  const ctaHeading = f["builders-craft.cta-heading"] ?? "";
  const ctaButtonLabel = f["builders-craft.cta-button-label"] ?? "";
  const ctaButtonHref = f["builders-craft.cta-button-href"] ?? "/contact";

  const publishedItems = items.filter((it) => it.published !== false);

  return (
    <div
      className="mx-auto w-full max-w-[1280px] px-4 pt-32 pb-24 md:px-12 md:pt-48 md:pb-32"
      style={{ background: "var(--builders-bg, #F8F9FA)" }}
    >
      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("service", "hero")}
        className="mb-32 grid grid-cols-1 gap-6 md:grid-cols-12"
      >
        <div className="flex flex-col justify-end md:col-span-8">
          <h1
            className="mb-6 text-4xl leading-none tracking-wider uppercase md:text-6xl lg:text-7xl"
            style={{
              fontFamily: "var(--font-builders-display, 'Jost', sans-serif)",
              fontWeight: 300,
              color: "var(--builders-ink, #131313)",
            }}
          >
            {service.name}
          </h1>

          {service.description && (
            <p
              className="max-w-2xl border-l-2 pl-6 text-lg leading-relaxed md:text-xl"
              style={{
                fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
                borderColor: "var(--builders-accent, #FFC5B6)",
                color: "var(--builders-ink, #131313)",
                opacity: 0.75,
              }}
            >
              {service.description}
            </p>
          )}
        </div>
      </section>

      {/* ── 2. Sub-Services ─────────────────────────────────────────────────── */}
      {publishedItems.length > 0 && (
        <section
          {...sectionGroupAttr("service", "sub-services")}
          aria-labelledby="sub-services-heading"
          className="mb-32"
        >
          {/* Section label */}
          <h2
            id="sub-services-heading"
            className="mb-8 border-b pb-2 text-xs tracking-widest uppercase"
            style={{
              fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              borderColor: "var(--builders-rule, #e5e7eb)",
              color: "var(--builders-ink, #131313)",
              opacity: 0.6,
            }}
          >
            Sub-Services
          </h2>

          {/* Item grid */}
          <div className="grid grid-cols-1 gap-x-12 gap-y-16 md:grid-cols-2">
            {publishedItems.map((item) => (
              <div
                key={item.id}
                className="group border-t pt-6 transition-colors duration-300 hover:border-[#FFC5B6]"
                style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
              >
                <h3
                  className="mb-3 text-lg tracking-wide uppercase"
                  style={{
                    fontFamily:
                      "var(--font-builders-display, 'Jost', sans-serif)",
                    fontWeight: 600,
                    color: "var(--builders-ink, #131313)",
                    fontSize: "20px",
                    lineHeight: 1.4,
                  }}
                >
                  {item.name}
                </h3>

                {item.description && (
                  <p
                    className="text-base leading-relaxed"
                    style={{
                      fontFamily:
                        "var(--font-builders-body, 'Agdasima', sans-serif)",
                      color: "var(--builders-ink, #131313)",
                      opacity: 0.7,
                    }}
                  >
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 3. CTA ──────────────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("service", "cta")}
        className="flex flex-col items-center border-t py-24 text-center"
        style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
      >
        {ctaHeading && (
          <h2
            className="mb-8 text-3xl font-light tracking-tight uppercase md:text-5xl"
            style={{
              fontFamily: "var(--font-builders-display, 'Jost', sans-serif)",
              color: "var(--builders-ink, #131313)",
            }}
          >
            {ctaHeading}
          </h2>
        )}

        {ctaButtonLabel && (
          <a
            href={ctaButtonHref}
            className="inline-flex items-center gap-2 border-2 bg-[var(--builders-accent)] px-8 py-4 text-xs tracking-widest uppercase transition-colors duration-200 hover:bg-[var(--builders-accent-hover)]"
            style={{
              fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              borderColor: "var(--builders-accent, #FFC5B6)",
              color: "var(--builders-accent-ink, #31130A)",
            }}
          >
            <span>{ctaButtonLabel}</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        )}
      </section>
    </div>
  );
}
