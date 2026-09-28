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
import { cn } from "~/lib/utils";
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
import { BambooPageShelf } from "../../shared/bamboo-page-shelf";

type ServiceItem = ServiceTemplateProps["items"][number];

/**
 * bamboo-template service detail page — BambooServicePage. Parity finding
 * PF16 (package TP6), see docs/templates/bamboo/parity-plan-2026-09-27.md.
 *
 * Ported from the sibling storefront's service detail page component and
 * re-skinned to bamboo tokens (forest/gold/cream, `--bam-*`). Unlike the
 * services INDEX page (which opens on the shared arch-portrait
 * `BambooPageHero`), this detail page keeps the reference source's own
 * header composition — docs/templates/bamboo/design.md's layout authority
 * reserves the shared page-hero/generic-page system for the marketing pages
 * it names (about, contact, generic, blog) and calls shop/product/cart/
 * checkout compositions "reference... restyled through bamboo tokens,
 * candidates for the same divergence treatment later" — a service detail
 * page is data-driven exactly like the product page (arbitrary
 * merchant-authored name/image/video), so it follows that same precedent:
 * `BambooPageShelf` (the product page's own back-link shelf component,
 * `variant="compact"`) for emblem clearance, then Outfit for the h1
 * (`service.name` is merchant/data-driven — same reasoning design.md gives
 * for keeping the product-page title off the fixed serif sizes).
 *
 * Layout:
 * 1. Compact shelf: "All Services" back-link (clears the header emblem)
 * 2. Header content: service name/description + optional image/video
 * 3. Optional intro section (heading + richtext + optional media)
 * 4. Items grid (bamboo-styled service item cards)
 * 5. Closing band (heading + body + button and/or booking embed)
 *
 * Fields live on `Service.customFields`, edited at `/admin/services/[id]` —
 * NOT the visual editor (there is no `sections.ts` entry for a service
 * detail page), so this file has no `sectionGroupAttr`/`fieldAttr`/
 * `isSectionVisible` calls. Mirrors `default-service-page`, dream's
 * per-service pages, etc.
 */
export async function BambooServicePage({
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const f = resolveFields(service.customFields, [
    "bamboo-service.small-label",
    "bamboo-service.hero-image",
    "bamboo-service.hero-video",
    "bamboo-service.intro-heading",
    "bamboo-service.intro-body",
    "bamboo-service.intro-image",
    "bamboo-service.intro-video",
    "bamboo-service.items-heading",
    "bamboo-service.closing-heading",
    "bamboo-service.closing-body",
    "bamboo-service.closing-button-text",
    "bamboo-service.closing-button-link",
    "bamboo-service.closing-embed",
    "bamboo-service.closing-embed-reveal",
  ]);

  const smallLabel = f["bamboo-service.small-label"] ?? "";
  const heroVideo = f["bamboo-service.hero-video"] ?? "";
  const heroImage =
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- cleared field resolves to "", not null/undefined
    f["bamboo-service.hero-image"] || service.image || "";
  const hasHeroMedia = Boolean(heroVideo) || Boolean(heroImage);

  const introHeading = f["bamboo-service.intro-heading"] ?? "";
  const introBodyRaw = f["bamboo-service.intro-body"];
  const introImage = f["bamboo-service.intro-image"] ?? "";
  const introVideo = f["bamboo-service.intro-video"] ?? "";

  const itemsHeading = f["bamboo-service.items-heading"] ?? "";

  const closingHeading = f["bamboo-service.closing-heading"] ?? "";
  const closingBody = f["bamboo-service.closing-body"] ?? "";
  const closingButtonText = f["bamboo-service.closing-button-text"] ?? "";
  const closingButtonLink = f["bamboo-service.closing-button-link"] ?? "";
  const closingEmbedRaw = f["bamboo-service.closing-embed"];

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
    f["bamboo-service.closing-embed-reveal"] === "true";
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
      {/* ── Back-link shelf (emblem clearance) ───────────────────────────── */}
      <BambooPageShelf variant="compact">
        <FadeIn direction="none" duration={0.3}>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-muted-foreground gap-1"
          >
            <Link href="/services">
              <ArrowLeft className="size-4" aria-hidden="true" />
              All Services
            </Link>
          </Button>
        </FadeIn>
      </BambooPageShelf>

      {/* ── Header content ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="flex flex-col items-start gap-12 md:flex-row md:items-center">
          <FadeIn className="flex flex-1 flex-col justify-center">
            {!!smallLabel && (
              <Badge className="mb-4 w-fit rounded-full">{smallLabel}</Badge>
            )}

            <h1 className="text-foreground font-heading text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-balance">{service.name}</span>
            </h1>

            {!!service.description && (
              <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
                {service.description}
              </p>
            )}
          </FadeIn>

          {hasHeroMedia && (
            <FadeIn
              direction="right"
              className="flex w-full flex-1 items-center justify-center"
            >
              <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-2xl border border-[var(--bam-hairline)] shadow-md">
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
      </section>

      {/* ── Intro section ─────────────────────────────────────────────────── */}
      {hasIntroSection && (
        <section className="mx-auto max-w-7xl px-4 py-16 md:py-24 lg:px-8">
          <div
            className={cn(
              "grid gap-12",
              hasIntroMedia && "lg:grid-cols-2 lg:items-center",
            )}
          >
            <FadeIn>
              {introHeading && (
                <h2 className="text-foreground font-serif mb-4 flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
                  <Leaf
                    className="h-5 w-5 shrink-0 text-[var(--bam-forest)]"
                    aria-hidden="true"
                  />
                  {introHeading}
                </h2>
              )}
              {hasIntroBody && introBodyJson && (
                <TiptapRenderer
                  content={introBodyJson}
                  className="text-muted-foreground prose prose-sm md:prose-base prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-[var(--bam-forest)] hover:prose-a:text-[var(--bam-forest-deep)] prose-strong:text-foreground max-w-none leading-relaxed"
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
                  className="aspect-4/3 w-full rounded-2xl border border-[var(--bam-hairline)] shadow-sm"
                />
              </FadeIn>
            )}
          </div>
        </section>
      )}

      {/* ── Items grid ────────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 md:py-24 lg:px-8">
          {itemsHeading && (
            <FadeIn className="mb-12">
              <h2 className="text-foreground font-serif flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
                <Sparkles
                  className="h-5 w-5 shrink-0 text-[var(--bam-forest)]"
                  aria-hidden="true"
                />
                {itemsHeading}
              </h2>
            </FadeIn>
          )}
          <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <StaggerItem key={item.id}>
                <BambooServiceItemCard
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
        <section className="border-t border-[var(--bam-hairline)] bg-[var(--bam-cream-deep)] py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <FadeIn>
              <div className="mx-auto max-w-2xl text-center">
                {closingHeading && (
                  <h2 className="text-foreground font-serif mb-4 text-2xl font-bold tracking-tight md:text-3xl">
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
                    <Button asChild size="lg" className="rounded-full">
                      <Link href={closingButtonLink}>
                        {closingButtonText}
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
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
                        className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--bam-forest)] px-8 text-sm font-medium text-[var(--bam-forest)] transition-colors hover:bg-[var(--bam-forest)] hover:text-[var(--bam-cream)]"
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

function BambooServiceItemCard({
  item,
  embedsEnabled,
}: {
  item: ServiceItem;
  embedsEnabled: boolean;
}) {
  const tiers = parseServicePriceTiers(item.priceTiers);
  const addOns = parseServiceAddOns(item.addOns);

  return (
    <div className="bg-card group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--bam-hairline)] shadow-sm transition-shadow hover:shadow-md">
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
          <h3 className="text-card-foreground font-bold">{item.name}</h3>
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
              <span className="font-bold text-[var(--bam-forest)]">
                {item.priceLabel}
              </span>
            )}
            {item.compareAtPriceLabel && (
              <span className="text-muted-foreground line-through">
                {item.compareAtPriceLabel}
              </span>
            )}
            {item.durationLabel && (
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {item.durationLabel}
              </span>
            )}
          </div>
        )}

        {/* Price tiers */}
        {tiers.length > 0 && (
          <dl className="space-y-1 rounded-xl bg-[var(--bam-cream-deep)] px-3 py-2 text-sm">
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
