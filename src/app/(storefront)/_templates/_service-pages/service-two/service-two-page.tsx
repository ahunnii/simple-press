import Image from "next/image";
import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import {
  getListFieldValue,
  parseTemplateIconListRows,
  parseTemplateIframeValue,
} from "~/lib/template-fields";
import {
  parseServicePriceTiers,
  parseServiceAddOns,
  type ServicePriceTier,
  type ServiceAddOn,
} from "~/lib/validators/services";
import { buttonVariants } from "~/components/ui/button";
import { db } from "~/server/db";
import { EmbedFrame } from "~/components/embed-frame";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { ServiceHeroVideo } from "../_shared/service-hero-video";
import { ServiceSectionMedia } from "../_shared/service-section-media";

import { resolveFields } from ".";

type Service = RouterOutputs["services"]["getBySlug"];
type ServiceItem = Service["items"][number];

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  service: Service;
  items: ServiceItem[];
  embedsEnabled: boolean;
};

/**
 * Service template: service-two — Media Rich
 *
 * Layout:
 * 1. Hero: native MP4 video (full-bleed) → embed video → text header fallback
 * 2. Photo gallery
 * 3. Intro body (richtext) + optional section media
 * 4. Highlight cards (icon + title + description)
 * 5. Grid of specific service item cards with booking dialog
 * 6. Closing CTA band (heading + button + optional booking embed)
 */
export async function ServiceTemplateTwo({
  service,
  items,
  embedsEnabled,
}: Props) {
  const f = resolveFields(service.customFields, [
    "service-two.hero-video-native",
    "service-two.hero-video",
    "service-two.gallery",
    "service-two.intro-body",
    "service-two.intro-image",
    "service-two.intro-video",
    "service-two.highlight-list",
    "service-two.cta-heading",
    "service-two.cta-text",
    "service-two.cta-link",
    "service-two.cta-embed",
  ]);

  const heroVideoNative = f["service-two.hero-video-native"] ?? "";
  const heroVideoSrc = f["service-two.hero-video"] ?? "";
  const galleryId = f["service-two.gallery"] ?? "";
  const introBodyRaw = f["service-two.intro-body"];
  const introImage = f["service-two.intro-image"] ?? "";
  const introVideo = f["service-two.intro-video"] ?? "";
  const ctaHeading = f["service-two.cta-heading"] ?? "";
  const ctaText = f["service-two.cta-text"] ?? "";
  const ctaLink = f["service-two.cta-link"] ?? "";
  const ctaEmbedRaw = f["service-two.cta-embed"];

  // Parse intro richtext JSON
  let introBodyJson: TiptapJSON | null = null;
  if (introBodyRaw) {
    try {
      introBodyJson = JSON.parse(introBodyRaw) as TiptapJSON;
    } catch {
      // not JSON
    }
  }

  // Fetch gallery if a gallery ID is set
  const gallery = galleryId
    ? await db.gallery.findUnique({
        where: { id: galleryId },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      })
    : null;

  // Parse highlight list
  const highlights = parseTemplateIconListRows(
    getListFieldValue(service.customFields, "service-two.highlight-list"),
  );

  const ctaEmbed = parseTemplateIframeValue(ctaEmbedRaw);
  const hasClosingCta = Boolean(ctaHeading || (ctaText && ctaLink) || ctaEmbed);
  const hasIntroMedia = Boolean(introVideo) || Boolean(introImage);

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {heroVideoNative ? (
        <section className="relative h-[60vh] min-h-[300px] w-full overflow-hidden bg-black">
          <ServiceHeroVideo src={heroVideoNative} />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-end pb-12">
            <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold text-white drop-shadow-md sm:text-4xl">
                {service.name}
              </h1>
              {service.description && (
                <p className="text-muted mt-3 max-w-2xl text-base drop-shadow sm:text-lg">
                  {service.description}
                </p>
              )}
            </div>
          </div>
        </section>
      ) : heroVideoSrc ? (
        <section className="relative w-full bg-black">
          <div className="mx-auto max-w-7xl">
            <EmbedFrame
              src={heroVideoSrc}
              title={`${service.name} video`}
              className="aspect-video w-full"
            />
          </div>
          <div className="bg-background px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
              <h1 className="text-foreground text-3xl font-bold sm:text-4xl">
                {service.name}
              </h1>
              {service.description && (
                <p className="text-muted-foreground mt-3 text-base sm:text-lg">
                  {service.description}
                </p>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="border-border bg-muted/30 border-b py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-foreground text-3xl font-bold sm:text-4xl">
              {service.name}
            </h1>
            {service.description && (
              <p className="text-muted-foreground mt-3 text-base sm:text-lg">
                {service.description}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Gallery ───────────────────────────────────────────────────────── */}
      {gallery && gallery.images.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
              {gallery.images.map((img) => (
                <div
                  key={img.id}
                  className="bg-muted relative aspect-square overflow-hidden rounded-lg"
                >
                  <Image
                    src={img.url}
                    alt={img.altText ?? ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Intro body + optional section media ───────────────────────────── */}
      {(introBodyJson ?? hasIntroMedia) && (
        <section className="border-border bg-background border-y py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div
              className={`grid gap-12 ${hasIntroMedia ? "lg:grid-cols-2 lg:items-start" : ""}`}
            >
              {introBodyJson && (
                <div className="prose prose-neutral max-w-none">
                  <TiptapRenderer content={introBodyJson} />
                </div>
              )}
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

      {/* ── Highlights ────────────────────────────────────────────────────── */}
      {highlights && highlights.length > 0 && (
        <section className="bg-muted/40 py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((hl, i) => (
                <div
                  key={i}
                  className="border-border bg-card flex flex-col gap-3 rounded-xl border p-6 shadow-sm"
                >
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                    <hl.icon
                      className="text-primary h-5 w-5"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-foreground font-semibold">{hl.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {hl.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Specific services grid ─────────────────────────────────────────── */}
      {items.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-foreground mb-10 text-2xl font-semibold sm:text-3xl">
              Our Services
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <ServiceItemCard
                  key={item.id}
                  item={item}
                  embedsEnabled={embedsEnabled}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Closing CTA band ─────────────────────────────────────────────── */}
      {hasClosingCta && (
        <section className="border-border bg-muted/30 border-t py-16 md:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            {ctaHeading && (
              <h2 className="text-foreground mb-6 text-2xl font-semibold sm:text-3xl">
                {ctaHeading}
              </h2>
            )}
            {ctaLink && ctaText && (
              <div className="mb-8">
                <Link
                  href={ctaLink}
                  className={buttonVariants({ size: "lg" })}
                >
                  {ctaText}
                </Link>
              </div>
            )}
            {ctaEmbed &&
              (embedsEnabled ? (
                <EmbedFrame
                  src={ctaEmbed.src}
                  height={ctaEmbed.height}
                  title={ctaEmbed.title || "Book"}
                  className="w-full"
                />
              ) : (
                <a
                  href={ctaEmbed.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  Open booking page
                </a>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ServiceItemCard({
  item,
  embedsEnabled,
}: {
  item: ServiceItem;
  embedsEnabled: boolean;
}) {
  const tiers = parseServicePriceTiers(item.priceTiers);
  const addOns = parseServiceAddOns(item.addOns);

  return (
    <div className="border-border bg-card flex flex-col overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md">
      {item.image && (
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-foreground text-base font-semibold">{item.name}</h3>
        {item.description && (
          <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
            {item.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {item.priceLabel && (
            <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 font-medium">
              {item.priceLabel}
            </span>
          )}
          {item.compareAtPriceLabel && (
            <span className="text-muted-foreground line-through opacity-60">
              {item.compareAtPriceLabel}
            </span>
          )}
          {item.durationLabel && (
            <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5">
              {item.durationLabel}
            </span>
          )}
        </div>

        {/* Price tiers */}
        {tiers.length > 0 && (
          <dl className="bg-muted/60 mt-2 space-y-1 rounded-lg px-3 py-2 text-xs">
            {tiers.map((tier: ServicePriceTier, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">{tier.label}</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  {tier.compareAtPriceLabel && (
                    <span className="text-muted-foreground line-through opacity-60">
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
            <p className="text-muted-foreground mb-1 font-semibold uppercase tracking-wide">
              Add-ons
            </p>
            <ul className="space-y-1">
              {addOns.map((addOn: ServiceAddOn, i: number) => (
                <li key={i}>
                  <span className="text-foreground font-medium">
                    {addOn.name}
                  </span>
                  {addOn.priceLabel && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {addOn.priceLabel}
                    </span>
                  )}
                  {addOn.description && (
                    <p className="text-muted-foreground mt-0.5">
                      {addOn.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

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
