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
 * Service template: service-three — Editorial
 *
 * Layout:
 * 1. Full-bleed hero: native MP4 video → image fallback, with service name + subheading overlay
 * 2. Editorial body (richtext) — two-column with secondary image on desktop
 * 3. Pull quote with optional flanking media (if present)
 * 4. Grid of specific service item cards with booking dialog
 * 5. Closing CTA band (heading + button + optional booking embed)
 */
export async function ServiceTemplateThree({
  service,
  items,
  embedsEnabled,
}: Props) {
  const f = resolveFields(service.customFields, [
    "service-three.hero-image",
    "service-three.hero-video",
    "service-three.subheading",
    "service-three.body",
    "service-three.secondary-image",
    "service-three.quote",
    "service-three.quote-image",
    "service-three.quote-video",
    "service-three.cta-heading",
    "service-three.cta-text",
    "service-three.cta-link",
    "service-three.cta-embed",
  ]);

  const heroImage = f["service-three.hero-image"] ?? "/placeholder.svg";
  const heroVideo = f["service-three.hero-video"] ?? "";
  const subheading = f["service-three.subheading"] ?? "";
  const bodyRaw = f["service-three.body"];
  const secondaryImage = f["service-three.secondary-image"] ?? "";
  const quote = f["service-three.quote"] ?? "";
  const quoteImage = f["service-three.quote-image"] ?? "";
  const quoteVideo = f["service-three.quote-video"] ?? "";
  const ctaHeading = f["service-three.cta-heading"] ?? "";
  const ctaText = f["service-three.cta-text"] ?? "";
  const ctaLink = f["service-three.cta-link"] ?? "";
  const ctaEmbedRaw = f["service-three.cta-embed"];

  // Parse body richtext JSON
  let bodyJson: TiptapJSON | null = null;
  if (bodyRaw) {
    try {
      bodyJson = JSON.parse(bodyRaw) as TiptapJSON;
    } catch {
      // not JSON
    }
  }

  const ctaEmbed = parseTemplateIframeValue(ctaEmbedRaw);
  const hasClosingCta = Boolean(ctaHeading || (ctaText && ctaLink) || ctaEmbed);
  const hasQuoteMedia = Boolean(quoteVideo) || Boolean(quoteImage);

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative h-[70vh] min-h-[360px] w-full overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex items-end pb-14">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
            {subheading && (
              <p className="mb-2 text-sm font-semibold tracking-widest text-white/80 uppercase">
                {subheading}
              </p>
            )}
            <h1 className="text-4xl leading-tight font-bold text-white drop-shadow-md sm:text-5xl lg:text-6xl">
              {service.name}
            </h1>
            {service.description && (
              <p className="mt-4 max-w-2xl text-base text-white/85 drop-shadow sm:text-lg">
                {service.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Editorial body + secondary image ─────────────────────────────── */}
      {(bodyJson ?? secondaryImage) && (
        <section className="py-20 md:py-32">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div
              className={`grid gap-12 ${
                secondaryImage ? "lg:grid-cols-2 lg:items-start" : ""
              }`}
            >
              {bodyJson && (
                <div className="prose prose-neutral max-w-none">
                  <TiptapRenderer content={bodyJson} />
                </div>
              )}
              {secondaryImage && (
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl">
                  <Image
                    src={secondaryImage}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Pull quote + optional flanking media ─────────────────────────── */}
      {(quote || hasQuoteMedia) && (
        <section className="border-border bg-muted/30 border-y py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div
              className={`grid gap-12 ${hasQuoteMedia ? "lg:grid-cols-2 lg:items-center" : ""}`}
            >
              {quote && (
                <blockquote className={hasQuoteMedia ? "" : "text-center"}>
                  <span
                    className="text-muted-foreground/40 text-5xl leading-none select-none"
                    aria-hidden="true"
                  >
                    &ldquo;
                  </span>
                  <p className="text-foreground mt-2 text-xl leading-relaxed font-medium italic sm:text-2xl">
                    {quote}
                  </p>
                  <span
                    className="text-muted-foreground/40 mt-2 block text-5xl leading-none select-none"
                    aria-hidden="true"
                  >
                    &rdquo;
                  </span>
                </blockquote>
              )}
              {hasQuoteMedia && (
                <ServiceSectionMedia
                  imageSrc={quoteImage}
                  videoSrc={quoteVideo}
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
        <section className="border-border bg-background border-t py-16 md:py-24">
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
