import Image from "next/image";
import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { parseTemplateIframeValue } from "~/lib/template-fields";
import {
  parseServiceAddOns,
  parseServicePriceTiers,
} from "~/lib/validators/services";
import { buttonVariants } from "~/components/ui/button";
import { EmbedDialog } from "~/components/embed-dialog";
import { EmbedFrame } from "~/components/embed-frame";
import { EmbedReveal } from "~/components/embed-reveal";
import { FadeIn } from "~/components/page-animations";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { ServiceHeroVideo } from "~/app/(storefront)/_templates/_service-pages/_shared/service-hero-video";
import { ServiceSectionMedia } from "~/app/(storefront)/_templates/_service-pages/_shared/service-section-media";

import { PollenGeneralLayout } from "../../layout/pollen-general-layout";
import { resolvePollenListFields } from "./fields";

type Service = RouterOutputs["services"]["getBySlug"];
type ServiceItem = Service["items"][number];

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  service: Service;
  items: ServiceItem[];
  embedsEnabled: boolean;
};

/**
 * Pollen service-page template: pollen-list — Elegant List
 *
 * Layout:
 * 1. PollenGeneralLayout title-hero (service name + description)
 * 2. Optional hero video band
 * 3. Accent stripe
 * 4. Narrow centered intro: label + heading + richtext + optional media
 * 5. Alternating left/right image + text rows for each service item
 * 6. Optional footer CTA + embed
 */
export function PollenListServicePage({
  business,
  service,
  items,
  embedsEnabled,
}: Props) {
  const f = resolvePollenListFields(service.customFields, [
    "pollen-list.accent-color",
    "pollen-list.hero-video",
    "pollen-list.intro-label",
    "pollen-list.intro-heading",
    "pollen-list.intro-body",
    "pollen-list.intro-image",
    "pollen-list.intro-video",
    "pollen-list.items-heading",
    "pollen-list.cta-text",
    "pollen-list.cta-link",
    "pollen-list.cta-embed",
    "pollen-list.cta-embed-reveal",
  ]);

  const accentColor = f["pollen-list.accent-color"] ?? "#5e8b4a";
  const heroVideoSrc = f["pollen-list.hero-video"] ?? "";
  const introLabel = f["pollen-list.intro-label"] ?? "";
  const introHeading = f["pollen-list.intro-heading"] ?? "";
  const introBodyRaw = f["pollen-list.intro-body"];
  const introImage = f["pollen-list.intro-image"] ?? "";
  const introVideoSrc = f["pollen-list.intro-video"] ?? "";
  const itemsHeading = f["pollen-list.items-heading"] ?? "";
  const ctaText = f["pollen-list.cta-text"] ?? "";
  const ctaLink = f["pollen-list.cta-link"] ?? "";
  const ctaEmbedRaw = f["pollen-list.cta-embed"] ?? "";

  const embed = ctaEmbedRaw ? parseTemplateIframeValue(ctaEmbedRaw) : null;
  const ctaEmbedReveal = f["pollen-list.cta-embed-reveal"] === "true";

  let introBodyJson: TiptapJSON | null = null;
  if (introBodyRaw) {
    try {
      introBodyJson = JSON.parse(introBodyRaw) as TiptapJSON;
    } catch {
      // not valid JSON — falls back to plain text
    }
  }

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

      {/* ── Accent stripe ────────────────────────────────────────────────── */}
      <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />

      {/* ── Centered intro ───────────────────────────────────────────────── */}
      {(introLabel ||
        introHeading ||
        introImage ||
        introVideoSrc ||
        introBodyRaw) && (
        <section className="bg-white py-20 md:py-28">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
            <FadeIn direction="up">
              {introLabel && (
                <p
                  className="mb-4 text-sm font-semibold tracking-wider uppercase"
                  style={{ color: accentColor }}
                >
                  {introLabel}
                </p>
              )}
              {introHeading && (
                <h2 className="mb-8 text-3xl leading-tight font-bold text-balance text-[#374151] md:text-4xl">
                  {introHeading}
                </h2>
              )}
              {introBodyJson && (
                <div className="prose prose-neutral mx-auto text-left text-[#4b5563] [&_a]:text-[#5e8b4a] [&_a:hover]:text-[#2a351f]">
                  <TiptapRenderer content={introBodyJson} />
                </div>
              )}
              {!introBodyJson && introBodyRaw && (
                <p className="leading-relaxed text-[#4b5563]">{introBodyRaw}</p>
              )}
              {(introVideoSrc || introImage) && (
                <div className="mx-auto mt-8 max-w-xl">
                  <ServiceSectionMedia
                    imageSrc={introImage || undefined}
                    videoSrc={introVideoSrc || undefined}
                    alt=""
                    className="relative aspect-video overflow-hidden rounded-2xl shadow-sm"
                    rounded={false}
                  />
                </div>
              )}
            </FadeIn>
          </div>
        </section>
      )}

      {/* ── Alternating service rows ─────────────────────────────────────── */}
      {publishedItems.length > 0 && (
        <section className="bg-[#f9faf7] py-12 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {itemsHeading && (
              <FadeIn direction="up">
                <h2 className="mb-16 text-2xl font-bold text-[#374151] md:text-3xl">
                  {itemsHeading}
                </h2>
              </FadeIn>
            )}

            <div className="flex flex-col divide-y divide-[#d4e8d4]">
              {publishedItems.map((item, idx) => (
                <PollenListItemRow
                  key={item.id}
                  item={item}
                  reversed={idx % 2 === 1}
                  embedsEnabled={embedsEnabled}
                  accentColor={accentColor}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Footer CTA + embed ──────────────────────────────────────────── */}
      {((ctaLink && ctaText) || !!embed) && (
        <section className="bg-[#2a351f] py-16 md:py-20">
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
                    className:
                      "border border-[#d4e8d4] bg-transparent! text-white hover:bg-[#d4e8d4]/10!",
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
                        className="overflow-hidden rounded-xl"
                        triggerLabel={embed.title ?? "Book Now"}
                        aspectRatio={embed.aspectRatio}
                        maxWidth={embed.maxWidth}
                        triggerClassName={buttonVariants({
                          variant: "outline",
                          size: "lg",
                          className:
                            "border-[#A8D081] text-[#A8D081] hover:bg-[#A8D081]/10!",
                        })}
                      />
                    </div>
                  ) : embed.displayMode === "dialog" ? (
                    <div className="text-center">
                      <EmbedDialog
                        src={embed.src}
                        title={embed.title ?? "Book"}
                        aspectRatio={embed.aspectRatio}
                        height={embed.height}
                        triggerLabel={
                          embed.triggerLabel ?? embed.title ?? "Book"
                        }
                      />
                    </div>
                  ) : (
                    <EmbedFrame
                      src={embed.src}
                      height={embed.height}
                      title={embed.title ?? "Book"}
                      className="overflow-hidden rounded-xl"
                      aspectRatio={embed.aspectRatio}
                      maxWidth={embed.maxWidth}
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
                        className:
                          "border-[#A8D081] text-[#A8D081] hover:bg-[#A8D081]/10!",
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

function PollenListItemRow({
  item,
  reversed,
  embedsEnabled,
  accentColor,
}: {
  item: ServiceItem;
  reversed: boolean;
  embedsEnabled: boolean;
  accentColor: string;
}) {
  return (
    <FadeIn
      direction={reversed ? "left" : "right"}
      className={`flex flex-col gap-8 py-16 lg:flex-row lg:items-center lg:gap-16 ${
        reversed ? "lg:flex-row-reverse" : ""
      }`}
    >
      {/* Image */}
      <div className="w-full shrink-0 lg:w-2/5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#d4e8d4] shadow-sm">
          {item.image ? (
            <Image
              src={item.image}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-5xl text-[#5e8b4a]/30">🌿</span>
            </div>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="flex-1">
        {/* Thin accent rule */}
        <div
          className="mb-6 h-0.5 w-10"
          style={{ backgroundColor: accentColor }}
        />
        <h3 className="mb-3 text-2xl font-bold text-[#374151]">{item.name}</h3>

        <div className="mb-4 flex flex-wrap gap-2">
          {item.priceLabel && (
            <span className="rounded-full bg-[#d4e8d4] px-3 py-0.5 text-xs font-semibold text-[#2a351f]">
              {item.priceLabel}
            </span>
          )}
          {item.compareAtPriceLabel && (
            <span className="rounded-full bg-[#f0f4ee] px-3 py-0.5 text-xs text-[#9ca3af] line-through">
              {item.compareAtPriceLabel}
            </span>
          )}
          {item.durationLabel && (
            <span className="rounded-full bg-[#f0f4ee] px-3 py-0.5 text-xs text-[#4b5563]">
              {item.durationLabel}
            </span>
          )}
        </div>

        {/* Price tiers */}
        {(() => {
          const tiers = parseServicePriceTiers(item.priceTiers);
          if (!tiers.length) return null;
          return (
            <div className="mb-4 space-y-1">
              {tiers.map((tier, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs text-[#4b5563]"
                >
                  <span className="font-medium">{tier.label}</span>
                  <span className="text-[#9ca3af]">—</span>
                  <span className="font-semibold text-[#2a351f]">
                    {tier.priceLabel}
                  </span>
                  {tier.compareAtPriceLabel && (
                    <span className="text-[#9ca3af] line-through">
                      {tier.compareAtPriceLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* Add-ons */}
        {(() => {
          const addOns = parseServiceAddOns(item.addOns);
          if (!addOns.length) return null;
          return (
            <div className="mb-4 border-t border-[#d4e8d4] pt-3">
              <p className="mb-1 text-xs font-semibold tracking-wide text-[#5e8b4a] uppercase">
                Add-ons
              </p>
              <div className="space-y-1">
                {addOns.map((addOn, i) => (
                  <div key={i} className="text-xs text-[#4b5563]">
                    <span className="font-medium">{addOn.name}</span>
                    {addOn.priceLabel && (
                      <span className="text-[#9ca3af]">
                        {" "}
                        · {addOn.priceLabel}
                      </span>
                    )}
                    {addOn.description && (
                      <p className="mt-0.5 text-[#9ca3af]">
                        {addOn.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {item.description && (
          <p className="mb-8 max-w-prose leading-relaxed text-[#6b7280]">
            {item.description}
          </p>
        )}

        <ServiceBookingDialog
          itemName={item.name}
          embedSrc={item.bookingEmbedSrc ?? undefined}
          embedHeight={item.bookingEmbedHeight}
          embedsEnabled={embedsEnabled}
          triggerLabel="Book This Service"
        />
      </div>
    </FadeIn>
  );
}
