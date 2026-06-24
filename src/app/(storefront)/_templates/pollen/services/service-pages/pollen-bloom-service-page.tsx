import Image from "next/image";
import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import {
  getListFieldValue,
  parseTemplateImageListRows,
  parseTemplateIframeValue,
} from "~/lib/template-fields";
import { parseServicePriceTiers, parseServiceAddOns } from "~/lib/validators/services";
import { buttonVariants } from "~/components/ui/button";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { EmbedFrame } from "~/components/embed-frame";
import { EmbedReveal } from "~/components/embed-reveal";
import { ServiceHeroVideo } from "~/app/(storefront)/_templates/_service-pages/_shared/service-hero-video";
import { ServiceSectionMedia } from "~/app/(storefront)/_templates/_service-pages/_shared/service-section-media";

import { PollenGeneralLayout } from "../../layout/pollen-general-layout";
import { resolvePollenBloomFields } from "./fields";

type Service = RouterOutputs["services"]["getBySlug"];
type ServiceItem = Service["items"][number];

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  service: Service;
  items: ServiceItem[];
  embedsEnabled: boolean;
};

/**
 * Pollen service-page template: pollen-bloom — Gallery Forward
 *
 * Layout:
 * 1. PollenGeneralLayout title-hero (service name + description, global header bg)
 * 2. Optional hero video band (full-width, before gallery)
 * 3. Mosaic gallery strip (2-4 owner-uploaded accent images)
 * 4. Centered intro: label + heading + richtext + optional media + optional CTA
 * 5. Image-heavy staggered service cards with soft green overlays
 * 6. Closing CTA section + optional embed
 */
export function PollenBloomServicePage({
  business,
  service,
  items,
  embedsEnabled,
}: Props) {
  const f = resolvePollenBloomFields(service.customFields, [
    "pollen-bloom.intro-label",
    "pollen-bloom.intro-heading",
    "pollen-bloom.intro-body",
    "pollen-bloom.items-heading",
    "pollen-bloom.cta-text",
    "pollen-bloom.cta-link",
    "pollen-bloom.hero-video",
    "pollen-bloom.intro-image",
    "pollen-bloom.intro-video",
    "pollen-bloom.cta-embed",
    "pollen-bloom.cta-embed-reveal",
  ]);

  const introLabel = f["pollen-bloom.intro-label"] ?? "";
  const introHeading = f["pollen-bloom.intro-heading"] ?? "";
  const introBodyRaw = f["pollen-bloom.intro-body"];
  const itemsHeading = f["pollen-bloom.items-heading"] ?? "";
  const ctaText = f["pollen-bloom.cta-text"] ?? "";
  const ctaLink = f["pollen-bloom.cta-link"] ?? "";
  const heroVideoSrc = f["pollen-bloom.hero-video"] ?? "";
  const introImage = f["pollen-bloom.intro-image"] ?? "";
  const introVideoSrc = f["pollen-bloom.intro-video"] ?? "";
  const ctaEmbedRaw = f["pollen-bloom.cta-embed"] ?? "";

  // Gallery images — stored as a list field on service.customFields
  const galleryImages =
    parseTemplateImageListRows(
      getListFieldValue(service.customFields, "pollen-bloom.gallery"),
    ) ?? [];

  let introBodyJson: TiptapJSON | null = null;
  if (introBodyRaw) {
    try {
      introBodyJson = JSON.parse(introBodyRaw) as TiptapJSON;
    } catch {
      // not valid JSON — falls back to plain text
    }
  }

  const embed = ctaEmbedRaw ? parseTemplateIframeValue(ctaEmbedRaw) : null;
  const ctaEmbedReveal = f["pollen-bloom.cta-embed-reveal"] === "true";
  const showClosingCta = (ctaLink && ctaText) || !!embed;

  const publishedItems = items.filter((item) => item.published);

  return (
    <PollenGeneralLayout
      business={business}
      title={service.name}
      subtitle={service.description ?? undefined}
    >
      {/* ── Hero video band ─────────────────────────────────────────────── */}
      {heroVideoSrc && (
        <div className="relative min-h-[60vh] overflow-hidden">
          <ServiceHeroVideo src={heroVideoSrc} />
        </div>
      )}

      {/* ── Mosaic gallery strip ─────────────────────────────────────────── */}
      {galleryImages.length > 0 && (
        <section className="bg-[#E5E8E0] py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <StaggerContainer
              className={`grid gap-3 ${
                galleryImages.length === 1
                  ? "grid-cols-1"
                  : galleryImages.length === 2
                    ? "grid-cols-2"
                    : galleryImages.length === 3
                      ? "grid-cols-3"
                      : "grid-cols-2 sm:grid-cols-4"
              }`}
            >
              {galleryImages.map((img, idx) => (
                <StaggerItem key={idx}>
                  <div
                    className={`relative overflow-hidden rounded-2xl ${
                      idx === 0 && galleryImages.length === 4
                        ? "row-span-2 aspect-[3/4]"
                        : "aspect-[3/4]"
                    }`}
                  >
                    <Image
                      src={img.image ?? "/placeholder.svg"}
                      alt={img.label ?? ""}
                      fill
                      className="object-cover transition-transform duration-700 hover:scale-105"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                    {/* Soft green overlay on hover */}
                    <div className="absolute inset-0 bg-[#2a351f]/0 transition-colors duration-300 hover:bg-[#2a351f]/10" />
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* ── Centered intro ───────────────────────────────────────────────── */}
      <section className="bg-white py-20 md:py-32">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <FadeIn direction="up">
            {introLabel && (
              <p className="mb-4 text-sm font-semibold tracking-wider text-[#5e8b4a] uppercase">
                {introLabel}
              </p>
            )}
            {introHeading && (
              <h2 className="mb-8 text-3xl leading-tight font-bold text-balance text-[#374151] md:text-4xl">
                {introHeading}
              </h2>
            )}
            {introBodyJson && (
              <div className="prose prose-neutral mx-auto mb-10 text-left text-[#4b5563] [&_a]:text-[#5e8b4a] [&_a:hover]:text-[#2a351f]">
                <TiptapRenderer content={introBodyJson} />
              </div>
            )}
            {!introBodyJson && introBodyRaw && (
              <p className="mb-10 leading-relaxed text-[#4b5563]">
                {introBodyRaw}
              </p>
            )}
            {(introVideoSrc || introImage) && (
              <div className="mt-8 mx-auto max-w-xl">
                <ServiceSectionMedia
                  imageSrc={introImage || undefined}
                  videoSrc={introVideoSrc || undefined}
                  alt=""
                  className="relative aspect-video overflow-hidden rounded-2xl shadow-md"
                  rounded={false}
                />
              </div>
            )}
            {ctaLink && ctaText && (
              <Link
                href={ctaLink}
                className={buttonVariants({
                  size: "lg",
                  className:
                    "gap-2 bg-[#2a351f]! text-white hover:bg-[#3d4d2f]!",
                })}
              >
                {ctaText}
              </Link>
            )}
          </FadeIn>
        </div>
      </section>

      {/* ── Image-heavy service cards ────────────────────────────────────── */}
      {publishedItems.length > 0 && (
        <section className="bg-[#d4e8d4] py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn direction="up">
              {itemsHeading && (
                <h2 className="mb-12 text-3xl font-bold text-[#374151] md:text-4xl">
                  {itemsHeading}
                </h2>
              )}
            </FadeIn>

            <StaggerContainer className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {publishedItems.map((item) => (
                <StaggerItem key={item.id}>
                  <PollenBloomItemCard
                    item={item}
                    embedsEnabled={embedsEnabled}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* ── Closing CTA + embed ─────────────────────────────────────────── */}
      {showClosingCta && (
        <section className="bg-[#2a351f] py-16 md:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {ctaLink && ctaText && (
              <FadeIn direction="up" className="mb-10 text-center">
                <p className="mb-2 text-sm font-semibold tracking-wider text-[#A8D081] uppercase">
                  Ready to begin?
                </p>
                <h2 className="mb-8 text-2xl font-bold text-white md:text-3xl">
                  {service.name}
                </h2>
                <Link
                  href={ctaLink}
                  className={buttonVariants({
                    size: "lg",
                    className: "border border-[#d4e8d4] bg-transparent! text-white hover:bg-[#d4e8d4]/10!",
                  })}
                >
                  {ctaText}
                </Link>
              </FadeIn>
            )}
            {embed && (
              <FadeIn direction="up">
                {embedsEnabled ? (
                  ctaEmbedReveal ? (
                    <div className="text-center">
                      <EmbedReveal
                        src={embed.src}
                        height={embed.height}
                        title={embed.title ?? "Book"}
                        className="rounded-xl overflow-hidden"
                        triggerLabel={embed.title ?? "Book Now"}
                        triggerClassName={buttonVariants({
                          variant: "outline",
                          size: "lg",
                          className: "border-[#A8D081] text-[#A8D081] hover:bg-[#A8D081]/10!",
                        })}
                      />
                    </div>
                  ) : (
                    <EmbedFrame
                      src={embed.src}
                      height={embed.height}
                      title={embed.title ?? "Book"}
                      className="rounded-xl overflow-hidden"
                    />
                  )
                ) : (
                  <div className="text-center">
                    <a
                      href={embed.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({
                        variant: "outline",
                        size: "lg",
                        className: "border-[#A8D081] text-[#A8D081] hover:bg-[#A8D081]/10!",
                      })}
                    >
                      {embed.title ?? "Book Now"} ↗
                    </a>
                  </div>
                )}
              </FadeIn>
            )}
          </div>
        </section>
      )}
    </PollenGeneralLayout>
  );
}

function PollenBloomItemCard({
  item,
  embedsEnabled,
}: {
  item: ServiceItem;
  embedsEnabled: boolean;
}) {
  const tiers = parseServicePriceTiers(item.priceTiers);
  const addOns = parseServiceAddOns(item.addOns);

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Large image with green overlay on hover */}
      <div className="relative aspect-[5/4] w-full overflow-hidden bg-[#d4e8d4]">
        {item.image ? (
          <>
            <Image
              src={item.image}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-[#2a351f]/0 transition-colors duration-300 group-hover:bg-[#2a351f]/10" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl text-[#5e8b4a]/30">🌿</span>
          </div>
        )}
        {/* Price badge pinned to image */}
        {item.priceLabel && (
          <span className="absolute top-4 right-4 rounded-full bg-[#2a351f] px-3 py-1 text-xs font-semibold text-white shadow">
            {item.priceLabel}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="text-lg font-bold text-[#2a351f]">{item.name}</h3>
        {item.durationLabel && (
          <p className="text-xs font-medium text-[#5e8b4a]">
            {item.durationLabel}
          </p>
        )}

        {/* Compare-at price in text body */}
        {item.compareAtPriceLabel && (
          <p className="text-xs text-[#9ca3af] line-through">{item.compareAtPriceLabel}</p>
        )}

        {/* Price tiers */}
        {tiers.length > 0 && (
          <div className="space-y-1">
            {tiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[#4b5563]">
                <span className="font-medium">{tier.label}</span>
                <span className="text-[#9ca3af]">—</span>
                <span className="font-semibold text-[#2a351f]">{tier.priceLabel}</span>
                {tier.compareAtPriceLabel && (
                  <span className="text-[#9ca3af] line-through">{tier.compareAtPriceLabel}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add-ons */}
        {addOns.length > 0 && (
          <div className="border-t border-[#d4e8d4] pt-3 mt-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#5e8b4a]">Add-ons</p>
            <div className="space-y-1">
              {addOns.map((addOn, i) => (
                <div key={i} className="text-xs text-[#4b5563]">
                  <span className="font-medium">{addOn.name}</span>
                  {addOn.priceLabel && (
                    <span className="text-[#9ca3af]"> · {addOn.priceLabel}</span>
                  )}
                  {addOn.description && (
                    <p className="text-[#9ca3af] mt-0.5">{addOn.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {item.description && (
          <p className="flex-1 text-sm leading-relaxed text-[#6b7280]">
            {item.description}
          </p>
        )}
        <div className="mt-4">
          <ServiceBookingDialog
            itemName={item.name}
            embedSrc={item.bookingEmbedSrc ?? undefined}
            embedHeight={item.bookingEmbedHeight}
            embedsEnabled={embedsEnabled}
            triggerLabel="Book Now"
          />
        </div>
      </div>
    </div>
  );
}
