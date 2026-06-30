import Image from "next/image";
import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { ServiceAddOn, ServicePriceTier } from "~/lib/validators/services";
import { parseTemplateIframeValue } from "~/lib/template-fields";
import {
  parseServiceAddOns,
  parseServicePriceTiers,
} from "~/lib/validators/services";
import { EmbedDialog } from "~/components/embed-dialog";
import { EmbedFrame } from "~/components/embed-frame";
import { EmbedReveal } from "~/components/embed-reveal";
import { PageTransition } from "~/components/page-animations";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import type { ServiceTemplateProps } from "../../../_service-pages/registry";
import { ServiceHeroVideo } from "../../../_service-pages/_shared/service-hero-video";
import { ServiceSectionMedia } from "../../../_service-pages/_shared/service-section-media";
import { resolveFields } from ".";

type ServiceItem = ServiceTemplateProps["items"][number];

/**
 * Default-template service detail page — DefaultServicePage
 *
 * Visual identity: editorial hairline borders, serif clamp headings,
 * `max-w-[1440px]` containers, `#efece8` warm CTA band — matching
 * `default-about-page` and `default-product-card`.
 *
 * Layout:
 * 1. Hero image or native video (60vh, default editorial overlay)
 * 2. Optional intro section (heading + richtext + optional media)
 * 3. Items grid (3-col, default service cards)
 * 4. Closing CTA band (button + optional booking embed)
 */
export async function DefaultServicePage({
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const f = resolveFields(service.customFields, [
    "default-service.hero-image",
    "default-service.hero-video",
    "default-service.intro-heading",
    "default-service.intro-body",
    "default-service.intro-image",
    "default-service.intro-video",
    "default-service.cta-text",
    "default-service.cta-link",
    "default-service.cta-embed",
    "default-service.cta-embed-reveal",
  ]);

  const heroImage = f["default-service.hero-image"] ?? "/placeholder.svg";
  const heroVideo = f["default-service.hero-video"] ?? "";
  const introHeading = f["default-service.intro-heading"] ?? "";
  const introBodyRaw = f["default-service.intro-body"];
  const introImage = f["default-service.intro-image"] ?? "";
  const introVideo = f["default-service.intro-video"] ?? "";
  const ctaText = f["default-service.cta-text"] ?? "";
  const ctaLink = f["default-service.cta-link"] ?? "";
  const ctaEmbedRaw = f["default-service.cta-embed"];

  // Attempt to parse richtext JSON; fall back gracefully
  let introBodyJson: TiptapJSON | null = null;
  if (introBodyRaw) {
    try {
      introBodyJson = JSON.parse(introBodyRaw) as TiptapJSON;
    } catch {
      // not valid JSON — plain text fallback is omitted (richtext fields only)
    }
  }

  const ctaEmbed = parseTemplateIframeValue(ctaEmbedRaw);
  const ctaEmbedReveal = f["default-service.cta-embed-reveal"] === "true";
  const hasClosingCta = Boolean(ctaText && ctaLink) || ctaEmbed !== null;
  const hasIntroMedia = Boolean(introVideo) || Boolean(introImage);
  const hasIntroSection =
    Boolean(introHeading) || Boolean(introBodyJson) || hasIntroMedia;

  return (
    <PageTransition>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("service", "hero")}
        className="relative h-[60vh] min-h-[320px] w-full overflow-hidden"
      >
        {heroVideo ? (
          <ServiceHeroVideo src={heroVideo} />
        ) : (
          <Image
            src={heroImage}
            alt={service.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex items-end pb-12">
          <div className="mx-auto w-full max-w-[1440px] px-6 lg:px-8">
            <h1 className="font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em] text-white text-balance">
              {service.name}
            </h1>
            {service.description && (
              <p className="mt-4 max-w-[560px] text-[17px] text-white/90">
                {service.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Intro section ─────────────────────────────────────────────────── */}
      {hasIntroSection && (
        <section
          {...sectionGroupAttr("service", "intro")}
          className="border-b border-[#e8e8e8] px-6 py-24 lg:px-8"
        >
          <div className="mx-auto max-w-[1440px]">
            <div
              className={`grid gap-12 ${hasIntroMedia ? "lg:grid-cols-2 lg:items-start" : ""}`}
            >
              <div className="max-w-[600px]">
                {introHeading && (
                  <h2 className="mb-6 font-serif text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.02em] text-balance">
                    {introHeading}
                  </h2>
                )}
                {introBodyJson && (
                  <TiptapRenderer
                    content={introBodyJson}
                    className="prose prose-sm prose-p:text-[15px] prose-p:leading-[1.75] prose-p:text-[#6b6b6b] max-w-none"
                  />
                )}
                {ctaLink && ctaText && (
                  <div className="mt-8">
                    <Link
                      href={ctaLink}
                      className="inline-flex h-12 items-center justify-center rounded-(--radius) bg-[#0a0a0a] px-8 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
                    >
                      {ctaText}
                    </Link>
                  </div>
                )}
              </div>
              {hasIntroMedia && (
                <ServiceSectionMedia
                  imageSrc={introImage}
                  videoSrc={introVideo}
                  alt={service.name}
                  className="aspect-[4/3] w-full"
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Items grid ────────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <section
          {...sectionGroupAttr("service", "items")}
          className="px-6 py-24 lg:px-8"
        >
          <div className="mx-auto max-w-[1440px]">
            <h2 className="mb-12 font-serif text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.02em]">
              Our Services
            </h2>
            <div className="grid grid-cols-1 gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <DefaultServiceItemCard
                  key={item.id}
                  item={item}
                  embedsEnabled={embedsEnabled}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Closing CTA band ──────────────────────────────────────────────── */}
      {hasClosingCta && (
        <section
          {...sectionGroupAttr("service", "cta")}
          className="bg-[#efece8] px-6 py-24 text-center lg:px-8"
        >
          <div className="mx-auto max-w-[640px]">
            {ctaLink && ctaText && (
              <div className="mb-8">
                <Link
                  href={ctaLink}
                  className="inline-flex h-12 items-center justify-center rounded-(--radius) bg-[#0a0a0a] px-8 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
                >
                  {ctaText}
                </Link>
              </div>
            )}
            {ctaEmbed &&
              (embedsEnabled ? (
                ctaEmbedReveal ? (
                  <EmbedReveal
                    src={ctaEmbed.src}
                    height={ctaEmbed.height}
                    title={ctaEmbed.title ?? "Book"}
                    className="w-full"
                    aspectRatio={ctaEmbed.aspectRatio}
                    maxWidth={ctaEmbed.maxWidth}
                  />
                ) : ctaEmbed.displayMode === "dialog" ? (
                  <EmbedDialog
                    src={ctaEmbed.src}
                    title={ctaEmbed.title ?? "Book"}
                    aspectRatio={ctaEmbed.aspectRatio}
                    height={ctaEmbed.height}
                    triggerLabel={
                      ctaEmbed.triggerLabel ?? ctaEmbed.title ?? "Book"
                    }
                  />
                ) : (
                  <EmbedFrame
                    src={ctaEmbed.src}
                    height={ctaEmbed.height}
                    title={ctaEmbed.title ?? "Book"}
                    className="w-full"
                    aspectRatio={ctaEmbed.aspectRatio}
                    maxWidth={ctaEmbed.maxWidth}
                  />
                )
              ) : (
                <a
                  href={ctaEmbed.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center rounded-(--radius) border border-[#0a0a0a] px-8 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
                >
                  Open booking page
                </a>
              ))}
          </div>
        </section>
      )}
    </PageTransition>
  );
}

function DefaultServiceItemCard({
  item,
  embedsEnabled,
}: {
  item: ServiceItem;
  embedsEnabled: boolean;
}) {
  const tiers = parseServicePriceTiers(item.priceTiers);
  const addOns = parseServiceAddOns(item.addOns);

  return (
    <div className="group flex flex-col overflow-hidden rounded-(--radius) border border-[#e8e8e8]">
      {/* Image well */}
      {item.image && (
        <div className="relative aspect-[16/7] w-full overflow-hidden bg-[#f6f6f6]">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-serif text-[18px] font-medium tracking-[-0.01em]">
          {item.name}
        </h3>
        {item.description && (
          <p className="flex-1 text-[14px] leading-relaxed text-[#6b6b6b]">
            {item.description}
          </p>
        )}

        {/* Price / duration pills */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {item.priceLabel && (
            <span className="rounded-full bg-[#f6f6f6] px-2.5 py-0.5 font-medium text-[#6b6b6b]">
              {item.priceLabel}
            </span>
          )}
          {item.compareAtPriceLabel && (
            <span className="text-[#6b6b6b] line-through opacity-60">
              {item.compareAtPriceLabel}
            </span>
          )}
          {item.durationLabel && (
            <span className="rounded-full bg-[#f6f6f6] px-2.5 py-0.5 text-[#6b6b6b]">
              {item.durationLabel}
            </span>
          )}
        </div>

        {/* Price tiers */}
        {tiers.length > 0 && (
          <dl className="mt-2 space-y-1 rounded-(--radius) bg-[#f6f6f6] px-3 py-2 text-xs">
            {tiers.map((tier: ServicePriceTier, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <dt className="text-[#6b6b6b]">{tier.label}</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  {tier.compareAtPriceLabel && (
                    <span className="text-[#6b6b6b] line-through opacity-60">
                      {tier.compareAtPriceLabel}
                    </span>
                  )}
                  <span>{tier.priceLabel}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/* Add-ons */}
        {addOns.length > 0 && (
          <div className="mt-2 text-xs">
            <p className="mb-1 font-semibold tracking-[0.1em] text-[#6b6b6b] uppercase">
              Add-ons
            </p>
            <ul className="space-y-1">
              {addOns.map((addOn: ServiceAddOn, i: number) => (
                <li key={i}>
                  <span className="font-medium text-[#0a0a0a]">
                    {addOn.name}
                  </span>
                  {addOn.priceLabel && (
                    <span className="text-[#6b6b6b]">
                      {" "}
                      · {addOn.priceLabel}
                    </span>
                  )}
                  {addOn.description && (
                    <p className="mt-0.5 text-[#6b6b6b]">
                      {addOn.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Booking dialog */}
        <div className="mt-3 flex items-center justify-end">
          <ServiceBookingDialog
            itemName={item.name}
            embedSrc={item.bookingEmbedSrc}
            embedHeight={item.bookingEmbedHeight}
            embedsEnabled={embedsEnabled}
          />
        </div>
      </div>
    </div>
  );
}
