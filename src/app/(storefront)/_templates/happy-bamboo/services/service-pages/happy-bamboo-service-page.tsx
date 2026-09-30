import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, Leaf, Sparkles } from "lucide-react";

import type { ServiceTemplateProps } from "../../../_service-pages/registry";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { ServiceAddOn, ServicePriceTier } from "~/lib/validators/services";
import {
  isContentEmpty,
  parseTemplateIframeValue,
} from "~/lib/template-fields";
import {
  parseServiceAddOns,
  parseServicePriceTiers,
} from "~/lib/validators/services";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { EmbedDialog } from "~/components/embed-dialog";
import { EmbedFrame } from "~/components/embed-frame";
import { EmbedReveal } from "~/components/embed-reveal";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from ".";
import { ServiceHeroVideo } from "../../../_service-pages/_shared/service-hero-video";
import { ServiceSectionMedia } from "../../../_service-pages/_shared/service-section-media";

type ServiceItem = ServiceTemplateProps["items"][number];

/**
 * happy-bamboo-template service detail page — HappyBambooServicePage
 *
 * Visual identity: the "page shelf" header used by
 * `happy-bamboo-contact-page` and `happy-bamboo-collection-page`
 * (`bg-muted/50` band, back link, optional small-label badge, serif h1),
 * `font-serif` section h2s with a small `text-primary` lucide icon, and
 * `rounded-2xl border border-border bg-card shadow-sm` item cards — matching
 * the rest of the happy-bamboo storefront.
 *
 * Layout:
 * 1. Header shelf (back link, optional badge, name, description, optional
 *    image/video)
 * 2. Optional intro section (heading + richtext + optional media)
 * 3. Items grid (bamboo-styled service cards)
 * 4. Closing band (heading + body + button and/or booking embed)
 *
 * Fields live on `Service.customFields`, edited at `/admin/services/[id]` —
 * NOT the visual editor (there is no `sections.ts` entry for a service
 * detail page), so this file has no `sectionGroupAttr`/`fieldAttr`/
 * `isSectionVisible` calls. Mirrors `default-service-page`, dream's
 * per-service pages, etc.
 */
export async function HappyBambooServicePage({
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const f = resolveFields(service.customFields, [
    "happy-bamboo-service.small-label",
    "happy-bamboo-service.hero-image",
    "happy-bamboo-service.hero-video",
    "happy-bamboo-service.intro-heading",
    "happy-bamboo-service.intro-body",
    "happy-bamboo-service.intro-image",
    "happy-bamboo-service.intro-video",
    "happy-bamboo-service.items-heading",
    "happy-bamboo-service.closing-heading",
    "happy-bamboo-service.closing-body",
    "happy-bamboo-service.closing-button-text",
    "happy-bamboo-service.closing-button-link",
    "happy-bamboo-service.closing-embed",
    "happy-bamboo-service.closing-embed-reveal",
  ]);

  const smallLabel = f["happy-bamboo-service.small-label"] ?? "";
  const heroVideo = f["happy-bamboo-service.hero-video"] ?? "";
  const heroImage =
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- cleared field resolves to "", not null/undefined
    f["happy-bamboo-service.hero-image"] || service.image || "";
  const hasHeroMedia = Boolean(heroVideo) || Boolean(heroImage);

  const introHeading = f["happy-bamboo-service.intro-heading"] ?? "";
  const introBodyRaw = f["happy-bamboo-service.intro-body"];
  const introImage = f["happy-bamboo-service.intro-image"] ?? "";
  const introVideo = f["happy-bamboo-service.intro-video"] ?? "";

  const itemsHeading = f["happy-bamboo-service.items-heading"] ?? "";

  const closingHeading = f["happy-bamboo-service.closing-heading"] ?? "";
  const closingBody = f["happy-bamboo-service.closing-body"] ?? "";
  const closingButtonText = f["happy-bamboo-service.closing-button-text"] ?? "";
  const closingButtonLink = f["happy-bamboo-service.closing-button-link"] ?? "";
  const closingEmbedRaw = f["happy-bamboo-service.closing-embed"];

  // Attempt to parse richtext JSON; fall back gracefully
  let introBodyJson: TiptapJSON | null = null;
  if (introBodyRaw) {
    try {
      introBodyJson = JSON.parse(introBodyRaw) as TiptapJSON;
    } catch {
      // not valid JSON — plain text fallback is omitted (richtext fields only)
    }
  }

  const closingEmbed = parseTemplateIframeValue(closingEmbedRaw);
  const closingEmbedReveal =
    f["happy-bamboo-service.closing-embed-reveal"] === "true";
  const hasClosingButton =
    Boolean(closingButtonText) && Boolean(closingButtonLink);
  const hasClosingCta = hasClosingButton || closingEmbed !== null;
  const hasIntroMedia = Boolean(introVideo) || Boolean(introImage);
  const hasIntroBody = introBodyJson !== null && !isContentEmpty(introBodyJson);
  // The heading has a default value, so on its own it would render an empty
  // "About This Service" band for every service without intro copy — require
  // real body content or media.
  const hasIntroSection = hasIntroBody || hasIntroMedia;

  return (
    <PageTransition>
      {/* ── Header shelf ─────────────────────────────────────────────────── */}
      <section className="bg-muted/50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex w-full flex-col items-center gap-12 md:flex-row">
            <FadeIn className="flex flex-1 flex-col justify-center text-left">
              <Link
                href="/services"
                className="text-muted-foreground hover:text-primary mb-6 inline-flex w-fit items-center gap-2 text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                All Services
              </Link>

              {!!smallLabel && (
                <Badge className="mb-4 w-fit">{smallLabel}</Badge>
              )}

              <h1 className="mb-4 font-serif text-4xl font-bold md:text-5xl">
                {service.name}
              </h1>

              {!!service.description && (
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {service.description}
                </p>
              )}
            </FadeIn>

            {hasHeroMedia && (
              <FadeIn
                direction="right"
                className="flex w-full flex-1 items-center justify-center"
              >
                <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-xl shadow-md">
                  {heroVideo ? (
                    <ServiceHeroVideo src={heroVideo} />
                  ) : (
                    <Image
                      src={heroImage}
                      alt={service.name}
                      fill
                      priority
                      sizes="(min-width: 768px) 448px, 100vw"
                      className="object-cover object-center"
                    />
                  )}
                </div>
              </FadeIn>
            )}
          </div>
        </div>
      </section>

      {/* ── Intro section ─────────────────────────────────────────────────── */}
      {hasIntroSection && (
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div
            className={`grid gap-12 ${hasIntroMedia ? "lg:grid-cols-2 lg:items-center" : ""}`}
          >
            <FadeIn>
              {introHeading && (
                <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl font-bold md:text-3xl">
                  <Leaf className="text-primary h-5 w-5 shrink-0" />
                  {introHeading}
                </h2>
              )}
              {hasIntroBody && introBodyJson && (
                <TiptapRenderer
                  content={introBodyJson}
                  className="text-muted-foreground prose prose-sm md:prose-base prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-foreground max-w-none leading-relaxed"
                />
              )}
            </FadeIn>
            {hasIntroMedia && (
              <FadeIn direction="right">
                <ServiceSectionMedia
                  imageSrc={introImage}
                  videoSrc={introVideo}
                  alt={service.name}
                  rounded={false}
                  className="border-border aspect-4/3 w-full rounded-2xl border shadow-sm"
                />
              </FadeIn>
            )}
          </div>
        </section>
      )}

      {/* ── Items grid ────────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <section className="container mx-auto px-4 py-16 md:py-24">
          {itemsHeading && (
            <FadeIn className="mb-12">
              <h2 className="flex items-center gap-2 font-serif text-2xl font-bold md:text-3xl">
                <Sparkles className="text-primary h-5 w-5 shrink-0" />
                {itemsHeading}
              </h2>
            </FadeIn>
          )}
          <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <StaggerItem key={item.id}>
                <HappyBambooServiceItemCard
                  item={item}
                  embedsEnabled={embedsEnabled}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      )}

      {/* ── Closing band ──────────────────────────────────────────────────── */}
      {hasClosingCta && (
        <section className="bg-muted/50 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                {closingHeading && (
                  <h2 className="mb-4 font-serif text-2xl font-bold md:text-3xl">
                    {closingHeading}
                  </h2>
                )}
                {closingBody && (
                  <p className="text-muted-foreground mb-8 leading-relaxed">
                    {closingBody}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-4">
                  {hasClosingButton && (
                    <Button asChild size="lg">
                      <Link href={closingButtonLink}>
                        {closingButtonText}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>

                {closingEmbed && (
                  <div className="mt-8">
                    {embedsEnabled ? (
                      closingEmbedReveal ? (
                        <EmbedReveal
                          src={closingEmbed.src}
                          height={closingEmbed.height}
                          title={closingEmbed.title ?? "Book"}
                          className="w-full"
                          aspectRatio={closingEmbed.aspectRatio}
                          maxWidth={closingEmbed.maxWidth}
                        />
                      ) : closingEmbed.displayMode === "dialog" ? (
                        <EmbedDialog
                          src={closingEmbed.src}
                          title={closingEmbed.title ?? "Book"}
                          aspectRatio={closingEmbed.aspectRatio}
                          height={closingEmbed.height}
                          triggerLabel={
                            closingEmbed.triggerLabel ??
                            closingEmbed.title ??
                            "Book"
                          }
                        />
                      ) : (
                        <EmbedFrame
                          src={closingEmbed.src}
                          height={closingEmbed.height}
                          title={closingEmbed.title ?? "Book"}
                          className="w-full"
                          aspectRatio={closingEmbed.aspectRatio}
                          maxWidth={closingEmbed.maxWidth}
                        />
                      )
                    ) : (
                      <a
                        href={closingEmbed.src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-primary text-primary hover:bg-primary inline-flex h-12 items-center justify-center rounded-full border px-8 text-sm font-medium transition-colors hover:text-white"
                      >
                        Open booking page
                      </a>
                    )}
                  </div>
                )}
              </div>
            </FadeIn>
          </div>
        </section>
      )}
    </PageTransition>
  );
}

function HappyBambooServiceItemCard({
  item,
  embedsEnabled,
}: {
  item: ServiceItem;
  embedsEnabled: boolean;
}) {
  const tiers = parseServicePriceTiers(item.priceTiers);
  const addOns = parseServiceAddOns(item.addOns);

  return (
    <div className="border-border bg-card group flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md">
      {/* Image well */}
      {item.image && (
        <div className="bg-muted relative aspect-video w-full overflow-hidden">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-bold">{item.name}</h3>
          {item.isSignature && <Badge>Signature</Badge>}
        </div>

        {item.category && (
          <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {item.category}
          </span>
        )}

        {item.description && (
          <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Price / duration */}
        {(item.priceLabel ?? item.durationLabel) && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {item.priceLabel && (
              <span className="text-primary font-bold">{item.priceLabel}</span>
            )}
            {item.compareAtPriceLabel && (
              <span className="text-muted-foreground line-through">
                {item.compareAtPriceLabel}
              </span>
            )}
            {item.durationLabel && (
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {item.durationLabel}
              </span>
            )}
          </div>
        )}

        {/* Price tiers */}
        {tiers.length > 0 && (
          <dl className="bg-muted/60 space-y-1 rounded-xl px-3 py-2 text-sm">
            {tiers.map((tier: ServicePriceTier, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">{tier.label}</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  {tier.compareAtPriceLabel && (
                    <span className="text-muted-foreground line-through">
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
          <div className="text-sm">
            <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
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

        {/* Booking dialog */}
        <div className="mt-2 flex items-center justify-end">
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
