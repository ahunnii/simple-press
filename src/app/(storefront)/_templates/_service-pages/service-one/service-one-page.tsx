import Image from "next/image";
import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { parseTemplateIframeValue } from "~/lib/template-fields";
import {
  parseServicePriceTiers,
  parseServiceAddOns,
  type ServicePriceTier,
  type ServiceAddOn,
} from "~/lib/validators/services";
import { buttonVariants } from "~/components/ui/button";
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
 * Service template: service-one — Clean / Minimal
 *
 * Layout:
 * 1. Hero image or native video (full-width, 60vh)
 * 2. Service header (name + description)
 * 3. Intro section (heading + richtext body + optional media + CTA button)
 * 4. Grid of specific service item cards with booking dialog
 * 5. Closing CTA band (button + optional booking embed)
 */
export async function ServiceTemplateOne({
  service,
  items,
  embedsEnabled,
}: Props) {
  const f = resolveFields(service.customFields, [
    "service-one.hero-image",
    "service-one.hero-video",
    "service-one.intro-heading",
    "service-one.intro-body",
    "service-one.intro-image",
    "service-one.intro-video",
    "service-one.cta-text",
    "service-one.cta-link",
    "service-one.cta-embed",
  ]);

  const heroImage = f["service-one.hero-image"] ?? "/placeholder.svg";
  const heroVideo = f["service-one.hero-video"] ?? "";
  const introHeading = f["service-one.intro-heading"] ?? "";
  const introBodyRaw = f["service-one.intro-body"];
  const introImage = f["service-one.intro-image"] ?? "";
  const introVideo = f["service-one.intro-video"] ?? "";
  const ctaText = f["service-one.cta-text"] ?? "";
  const ctaLink = f["service-one.cta-link"] ?? "";
  const ctaEmbedRaw = f["service-one.cta-embed"];

  // Attempt to parse richtext JSON; fall back to plain text rendering
  let introBodyJson: TiptapJSON | null = null;
  if (introBodyRaw) {
    try {
      introBodyJson = JSON.parse(introBodyRaw) as TiptapJSON;
    } catch {
      // not valid JSON — will render as plain text fallback
    }
  }

  const ctaEmbed = parseTemplateIframeValue(ctaEmbedRaw);
  const hasClosingCta = Boolean(ctaText && ctaLink) || ctaEmbed !== null;
  const hasIntroMedia = Boolean(introVideo) || Boolean(introImage);
  const hasIntroSection =
    Boolean(introHeading) || Boolean(introBodyJson) || hasIntroMedia;

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative h-[60vh] min-h-[300px] w-full overflow-hidden">
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
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 flex items-end pb-12">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-white drop-shadow-md sm:text-4xl lg:text-5xl">
              {service.name}
            </h1>
            {service.description && (
              <p className="mt-3 max-w-2xl text-base text-white/90 drop-shadow sm:text-lg">
                {service.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Intro section ─────────────────────────────────────────────────── */}
      {hasIntroSection && (
        <section className="border-border bg-background border-b py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div
              className={`grid gap-12 ${hasIntroMedia ? "lg:grid-cols-2 lg:items-start" : ""}`}
            >
              <div className="max-w-3xl">
                {introHeading && (
                  <h2 className="text-foreground mb-6 text-2xl font-semibold sm:text-3xl">
                    {introHeading}
                  </h2>
                )}
                {introBodyJson && (
                  <div className="prose prose-neutral max-w-none">
                    <TiptapRenderer content={introBodyJson} />
                  </div>
                )}
                {ctaLink && ctaText && (
                  <div className="mt-8">
                    <Link
                      href={ctaLink}
                      className={buttonVariants({ size: "lg" })}
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

      {/* ── Specific services grid ─────────────────────────────────────────── */}
      {items.length > 0 && (
        <section className="bg-muted/30 py-16 md:py-24">
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
        <section className="border-border bg-background border-t py-16 md:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
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
