import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
};

export async function BuildersServicesIndexPage({ business, services }: Props) {
  const customFields = business.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "builders.services.hero-title",
    "builders.services.hero-subtitle",
    "builders.services.cta-heading",
    "builders.services.cta-button-label",
    "builders.services.cta-button-href",
  ]);

  const heroTitle = f["builders.services.hero-title"] ?? "Our Craft";
  const heroSubtitle = f["builders.services.hero-subtitle"] ?? "";
  const ctaHeading = f["builders.services.cta-heading"] ?? "Ready to Build";
  const ctaButtonLabel =
    f["builders.services.cta-button-label"] ?? "Contact the Cooperative";
  const ctaButtonHref = f["builders.services.cta-button-href"] ?? "/contact";

  return (
    <div
      className="mx-auto w-full max-w-[1280px] px-4 pt-32 pb-24 md:px-12 md:pt-48 md:pb-32"
      style={{ background: "var(--builders-bg, #F8F9FA)" }}
    >
      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("services", "hero")}
        className="mb-32 grid grid-cols-1 gap-6 md:grid-cols-12"
      >
        <div className="flex flex-col justify-end md:col-span-8">
          <h1
            {...fieldAttr("builders.services.hero-title")}
            className="mb-6 text-4xl leading-none tracking-tight uppercase md:text-6xl lg:text-7xl"
            style={{
              fontFamily: "var(--font-builders-display, 'Jost', sans-serif)",
              fontWeight: 300,
              color: "var(--builders-ink, #131313)",
            }}
          >
            {heroTitle}
          </h1>

          {heroSubtitle && (
            <p
              {...fieldAttr("builders.services.hero-subtitle")}
              className="max-w-2xl border-l-2 pl-6 text-lg leading-relaxed md:text-xl"
              style={{
                fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
                borderColor: "var(--builders-accent, #FFC5B6)",
                color: "var(--builders-ink, #131313)",
                opacity: 0.75,
              }}
            >
              {heroSubtitle}
            </p>
          )}
        </div>
      </section>

      {/* ── 2. Service Grid ─────────────────────────────────────────────────── */}
      {/* DB-driven service listing — no editable template fields, so no
          data-sp-group hotspot (nothing to open in the field panel). */}
      <section className="mb-32">
        {services.length === 0 ? (
          <div
            className="flex items-center justify-center border py-24 text-center"
            style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
          >
            <p
              className="text-base tracking-widest uppercase"
              style={{
                fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
                color: "var(--builders-ink, #131313)",
                opacity: 0.5,
              }}
            >
              No services yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {services.map((service) => (
              <Link
                key={service.id}
                href={`/services/${service.slug}`}
                className="group flex min-h-[400px] flex-col border p-6 transition-colors duration-300 hover:border-[#FFC5B6]"
                style={{
                  borderColor: "var(--builders-rule, #e5e7eb)",
                  background: "var(--builders-surface, #ffffff)",
                }}
              >
                {/* Service image */}
                {service.image ? (
                  <div
                    className="mb-6 h-48 w-full overflow-hidden border"
                    style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={service.image}
                      alt={service.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : (
                  <div
                    className="mb-6 h-48 w-full border"
                    style={{
                      borderColor: "var(--builders-rule, #e5e7eb)",
                      background: "var(--builders-alt, #F1F3F5)",
                    }}
                    aria-hidden="true"
                  />
                )}

                {/* Service name */}
                <h2
                  className="mb-4 text-2xl tracking-wide uppercase"
                  style={{
                    fontFamily:
                      "var(--font-builders-display, 'Jost', sans-serif)",
                    fontWeight: 500,
                    color: "var(--builders-ink, #131313)",
                  }}
                >
                  {service.name}
                </h2>

                {/* Service description */}
                {service.description && (
                  <p
                    className="line-clamp-3 flex-1 text-base leading-relaxed"
                    style={{
                      fontFamily:
                        "var(--font-builders-body, 'Agdasima', sans-serif)",
                      color: "var(--builders-ink, #131313)",
                      opacity: 0.75,
                    }}
                  >
                    {service.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── 3. CTA ──────────────────────────────────────────────────────────── */}
      {isSectionVisible(customFields, "builders", "services.cta") && (
        <section
          {...sectionGroupAttr("services", "cta")}
          className="flex flex-col items-center border-t py-24 text-center"
          style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
        >
          <h2
            {...fieldAttr("builders.services.cta-heading")}
            className="mb-8 text-3xl tracking-tight uppercase md:text-5xl"
            style={{
              fontFamily: "var(--font-builders-display, 'Jost', sans-serif)",
              fontWeight: 600,
              color: "var(--builders-ink, #131313)",
            }}
          >
            {ctaHeading}
          </h2>

          <a
            href={ctaButtonHref}
            {...fieldAttr("builders.services.cta-button-label")}
            className="border-2 bg-[var(--builders-accent)] px-8 py-4 text-xs tracking-widest uppercase transition-colors duration-200 hover:bg-[var(--builders-accent-hover)]"
            style={{
              borderColor: "var(--builders-accent, #FFC5B6)",
              color: "var(--builders-accent-ink, #31130A)",
              fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
            }}
          >
            {ctaButtonLabel}
          </a>
        </section>
      )}
    </div>
  );
}
