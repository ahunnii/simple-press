import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { type TiptapJSON, TiptapRenderer } from "~/components/tiptap-renderer";
import { buttonVariants } from "~/components/ui/button";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { PollenGeneralLayout } from "../../layout/pollen-general-layout";
import { resolvePollenSpaFields } from "./fields";

type Service = RouterOutputs["services"]["getBySlug"];
type ServiceItem = Service["items"][number];

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  service: Service;
  items: ServiceItem[];
  embedsEnabled: boolean;
};

/**
 * Pollen service-page template: pollen-spa — Serene Editorial
 *
 * Layout:
 * 1. PollenGeneralLayout title-hero (service name + description)
 * 2. Two-column intro: richtext left, accent image right
 * 3. Three-column card grid of individual service items
 */
export function PollenSpaServicePage({
  business,
  service,
  items,
  embedsEnabled,
}: Props) {
  const f = resolvePollenSpaFields(service.customFields, [
    "pollen-spa.hero-image",
    "pollen-spa.intro-label",
    "pollen-spa.intro-heading",
    "pollen-spa.intro-body",
    "pollen-spa.intro-accent-image",
    "pollen-spa.items-heading",
    "pollen-spa.items-subheading",
    "pollen-spa.cta-text",
    "pollen-spa.cta-link",
  ]);

  const heroImage = f["pollen-spa.hero-image"] ?? "/placeholder.svg";
  const introLabel = f["pollen-spa.intro-label"] ?? "";
  const introHeading = f["pollen-spa.intro-heading"] ?? "";
  const introBodyRaw = f["pollen-spa.intro-body"];
  const accentImage = f["pollen-spa.intro-accent-image"] ?? "/placeholder.svg";
  const itemsHeading = f["pollen-spa.items-heading"] ?? "";
  const itemsSubheading = f["pollen-spa.items-subheading"] ?? "";
  const ctaText = f["pollen-spa.cta-text"] ?? "";
  const ctaLink = f["pollen-spa.cta-link"] ?? "";

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
      imageUrl={heroImage}
    >
      {/* ── Two-column intro ─────────────────────────────────────────────── */}
      <section className="bg-[#d4e8d4] py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Text column */}
            <FadeIn direction="right">
              <div>
                {introLabel && (
                  <p className="mb-4 text-sm font-semibold tracking-wider text-[#2a351f] uppercase">
                    {introLabel}
                  </p>
                )}
                {introHeading && (
                  <h2 className="mb-6 text-3xl leading-tight font-bold text-balance text-[#374151] md:text-4xl">
                    {introHeading}
                  </h2>
                )}
                {introBodyJson && (
                  <div className="prose prose-neutral mb-8 max-w-none text-[#4b5563] [&_a]:text-[#5e8b4a] [&_a:hover]:text-[#2a351f]">
                    <TiptapRenderer content={introBodyJson} />
                  </div>
                )}
                {!introBodyJson && introBodyRaw && (
                  <p className="mb-8 leading-relaxed whitespace-pre-line text-[#4b5563]">
                    {introBodyRaw}
                  </p>
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
              </div>
            </FadeIn>

            {/* Accent image column */}
            <FadeIn
              direction="left"
              delay={0.1}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-md"
            >
              <Image
                src={accentImage}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Service items grid ───────────────────────────────────────────── */}
      {publishedItems.length > 0 && (
        <section className="bg-white py-20 md:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <FadeIn direction="up">
              {itemsHeading && (
                <h2 className="mb-3 text-3xl font-bold text-[#374151] md:text-4xl">
                  {itemsHeading}
                </h2>
              )}
              {itemsSubheading && (
                <p className="mb-12 max-w-2xl text-[#6b7280]">
                  {itemsSubheading}
                </p>
              )}
              {!itemsSubheading && itemsHeading && (
                <div className="mb-12" />
              )}
            </FadeIn>

            <StaggerContainer className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {publishedItems.map((item) => (
                <StaggerItem key={item.id}>
                  <PollenSpaItemCard item={item} embedsEnabled={embedsEnabled} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}
    </PollenGeneralLayout>
  );
}

function PollenSpaItemCard({
  item,
  embedsEnabled,
}: {
  item: ServiceItem;
  embedsEnabled: boolean;
}) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#2a351f]/10 bg-white shadow-sm transition-shadow hover:shadow-md">
      {item.image && (
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f5f2ee]">
          <Image
            src={item.image}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="text-lg font-bold text-[#2a351f]">{item.name}</h3>
        {item.description && (
          <p className="flex-1 text-sm leading-relaxed text-[#6b7280]">
            {item.description}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#d4e8d4] pt-4">
          <div className="flex flex-wrap gap-2">
            {item.priceLabel && (
              <span className="rounded-full bg-[#d4e8d4] px-3 py-0.5 text-xs font-semibold text-[#2a351f]">
                {item.priceLabel}
              </span>
            )}
            {item.durationLabel && (
              <span className="rounded-full bg-[#f0f4ee] px-3 py-0.5 text-xs text-[#4b5563]">
                {item.durationLabel}
              </span>
            )}
          </div>
          <ServiceBookingDialog
            itemName={item.name}
            embedSrc={item.bookingEmbedSrc ?? undefined}
            embedHeight={item.bookingEmbedHeight}
            embedsEnabled={embedsEnabled}
            triggerLabel="Book"
          />
        </div>
      </div>
    </div>
  );
}
