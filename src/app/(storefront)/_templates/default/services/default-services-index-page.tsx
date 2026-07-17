import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
};

export async function DefaultServicesIndexPage({ business, services }: Props) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "default.services.hero-eyebrow",
    "default.services.hero-heading",
    "default.services.hero-tagline",
    "default.services.hero-image",
    "default.services.intro-heading",
    "default.services.intro-body",
    "default.services.cta-eyebrow",
    "default.services.cta-heading",
    "default.services.cta-button-text",
    "default.services.cta-button-link",
  ]);

  const heroImage = f["default.services.hero-image"];
  const hasHeroImage =
    Boolean(heroImage) && heroImage !== "/placeholder.svg" && heroImage !== "";

  const hasIntro =
    Boolean(f["default.services.intro-heading"]) ||
    Boolean(f["default.services.intro-body"]);

  return (
    <PageTransition>
      {/* ── Page hero ────────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("services", "hero")}
        className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          {f["default.services.hero-eyebrow"] && (
            <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
              {f["default.services.hero-eyebrow"]}
            </span>
          )}
          <h1 className="mt-3 font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em] text-balance">
            {f["default.services.hero-heading"] ?? "Services"}
          </h1>
          {f["default.services.hero-tagline"] && (
            <p className="mt-4 max-w-[560px] text-[17px] text-[#6b6b6b]">
              {f["default.services.hero-tagline"]}
            </p>
          )}

          {/* Optional wide hero image */}
          {hasHeroImage && (
            <div className="relative mt-10 aspect-16/7 overflow-hidden rounded-t-(--radius) bg-[#efece8]">
              <Image
                src={heroImage ?? "/placeholder.svg"}
                alt={f["default.services.hero-heading"] ?? business.name}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Optional intro band ──────────────────────────────────────────── */}
      {hasIntro &&
        isSectionVisible(customFields, "default", "services.intro") && (
          <section
            {...sectionGroupAttr("services", "intro")}
            className="border-b border-[#e8e8e8] px-6 py-24 lg:px-8"
          >
            <div className="mx-auto max-w-[1440px]">
              {f["default.services.intro-heading"] && (
                <h2 className="font-serif text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.02em] text-balance">
                  {f["default.services.intro-heading"]}
                </h2>
              )}
              {f["default.services.intro-body"] && (
                <p className="mt-6 max-w-[640px] text-[17px] leading-[1.65] text-[#6b6b6b]">
                  {f["default.services.intro-body"]}
                </p>
              )}
            </div>
          </section>
        )}

      {/* ── Service grid ─────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("services", "list")}
        className="px-6 py-16 lg:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          {services.length === 0 ? (
            <div className="rounded-(--radius) border border-[#e8e8e8] py-24 text-center">
              <p className="text-[15px] text-[#6b6b6b]">No services yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Link
                  key={service.id}
                  href={`/services/${service.slug}`}
                  className="group block"
                >
                  {/* Image well */}
                  <div className="relative mb-4 aspect-3/4 overflow-hidden rounded-(--radius) bg-[#efece8]">
                    {service.image ? (
                      <Image
                        src={service.image}
                        alt={service.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : null}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col gap-1.5">
                    <h2 className="font-serif text-[22px] font-medium tracking-[-0.015em]">
                      {service.name}
                    </h2>
                    {service.description && (
                      <p className="line-clamp-3 text-[14px] leading-relaxed text-[#6b6b6b]">
                        {service.description}
                      </p>
                    )}
                    <span className="mt-1 text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
                      Explore →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      {isSectionVisible(customFields, "default", "services.cta") && (
        <section
          {...sectionGroupAttr("services", "cta")}
          className="bg-[#efece8] px-6 py-24 text-center lg:px-8"
        >
          <div className="mx-auto max-w-[640px]">
            {f["default.services.cta-eyebrow"] && (
              <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
                {f["default.services.cta-eyebrow"]}
              </span>
            )}
            <h2 className="mt-3 font-serif text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.02em]">
              {f["default.services.cta-heading"] ?? "Tell us what you need."}
            </h2>
            <div className="mt-8">
              <Link
                href={f["default.services.cta-button-link"] ?? "/contact"}
                className="inline-flex h-12 items-center justify-center rounded-(--radius) bg-[#0a0a0a] px-8 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
              >
                {f["default.services.cta-button-text"] ?? "Get in touch"}
              </Link>
            </div>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
