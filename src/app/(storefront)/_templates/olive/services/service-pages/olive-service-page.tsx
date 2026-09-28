import type { CSSProperties } from "react";
import Image from "next/image";
import { ArrowUpRight, Clock } from "lucide-react";

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
import { EmbedDialog } from "~/components/embed-dialog";
import { EmbedFrame } from "~/components/embed-frame";
import { EmbedReveal } from "~/components/embed-reveal";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from ".";
import { ServiceSectionMedia } from "../../../_service-pages/_shared/service-section-media";
import { OliveClosingBand } from "../../generic/olive-closing-band";
import { OliveGatedButton } from "../../generic/olive-gated-button";
import { OlivePageBand } from "../../generic/olive-page-band";
import { OlivePageSection } from "../../generic/olive-page-section";
import {
  hasOliveImage,
  OliveBreadcrumb,
  OliveButton,
  OliveReveal,
  OliveRevealGroup,
} from "../../shared";

type ServiceItem = ServiceTemplateProps["items"][number];

/**
 * The shared booking trigger (`ServiceBookingDialog`) is a shadcn `Button`
 * reading shadcn variables. `.olive-shadcn-bridge` maps the neutral ones; the
 * primary fill, hover wash and pill radius are mapped here so the trigger
 * prints as olive's sage pill. The dialog itself portals outside `.olive`
 * (known backlog — not styled here).
 */
const OLIVE_BOOKING_TRIGGER_VARS = {
  "--primary": "var(--olive-sage)",
  "--primary-foreground": "var(--olive-white)",
  "--accent": "var(--olive-sage-tint)",
  "--accent-foreground": "var(--olive-ink)",
  "--radius": "999px",
} as CSSProperties;

/** Olive's pill, laid over the shared embed triggers' shadcn button. */
const OLIVE_EMBED_TRIGGER_CLASS = "olive-btn olive-btn-primary";

/**
 * olive-template service detail page — `OliveServicePage` (parity finding
 * PF11, package TP5), built on olive's generic page base.
 *
 * 1. `OlivePageBand`: breadcrumb (Services → this service), the service
 *    name as the page's only h1, its description as the intro. With a
 *    header photo/video (or the service's own image) it is the cover
 *    variant, title card on the page edge; otherwise the plain white band.
 * 2. Intro (`OlivePageSection`): heading + rich text, optional photo/video
 *    beside it. Only when there is real text or media.
 * 3. Appointments (paper `OlivePageSection`): one `olive-card` per service
 *    item — photo, name, category, price/compare-at/duration, price tiers,
 *    add-ons, and the booking trigger.
 * 4. Closing (`OliveClosingBand`): button and/or booking embed. The embed
 *    renders outside the reveal (a booking form never starts hidden).
 *
 * Every section sits on the same left edge (120px at 1440, 16px at 390).
 * Fields live on `Service.customFields` (admin service editor), so there is
 * no visual-editor wiring here — same as bamboo's and Default's variants.
 */
export function OliveServicePage({
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const f = resolveFields(service.customFields, [
    "olive-service.hero-image",
    "olive-service.hero-video",
    "olive-service.intro-heading",
    "olive-service.intro-body",
    "olive-service.intro-image",
    "olive-service.intro-video",
    "olive-service.items-heading",
    "olive-service.book-label",
    "olive-service.closing-heading",
    "olive-service.closing-body",
    "olive-service.closing-button-text",
    "olive-service.closing-button-link",
    "olive-service.closing-embed",
    "olive-service.closing-embed-reveal",
  ]);

  const heroVideo = (f["olive-service.hero-video"] ?? "").trim();
  const heroImageField = f["olive-service.hero-image"] ?? "";
  const heroImage = hasOliveImage(heroImageField)
    ? heroImageField
    : (service.image ?? "");
  const hasCover = Boolean(heroVideo) || hasOliveImage(heroImage);

  const introHeading = (f["olive-service.intro-heading"] ?? "").trim();
  const introBodyRaw = f["olive-service.intro-body"];
  const introImage = hasOliveImage(f["olive-service.intro-image"])
    ? (f["olive-service.intro-image"] ?? "")
    : "";
  const introVideo = (f["olive-service.intro-video"] ?? "").trim();

  const itemsHeading = (f["olive-service.items-heading"] ?? "").trim();
  const bookLabel = (f["olive-service.book-label"] ?? "").trim() || "Book";

  const closingHeading = (f["olive-service.closing-heading"] ?? "").trim();
  const closingBody = f["olive-service.closing-body"] ?? "";
  const closingButtonText = f["olive-service.closing-button-text"] ?? "";
  const closingButtonLink = f["olive-service.closing-button-link"] ?? "";
  const closingEmbed = parseTemplateIframeValue(
    f["olive-service.closing-embed"],
  );
  const closingEmbedReveal = f["olive-service.closing-embed-reveal"] === "true";

  // Rich text is stored as a string-encoded Tiptap doc; anything else is
  // treated as no body (richtext fields only).
  let introBodyJson: TiptapJSON | null = null;
  if (introBodyRaw) {
    try {
      introBodyJson = JSON.parse(introBodyRaw) as TiptapJSON;
    } catch {
      introBodyJson = null;
    }
  }

  const hasIntroMedia = Boolean(introVideo) || Boolean(introImage);
  const hasIntroBody = introBodyJson !== null && !isContentEmpty(introBodyJson);
  // The heading has a default value, so on its own it would render an empty
  // "What to expect" band for every service without intro copy — require
  // real body content or media.
  const hasIntro = hasIntroBody || hasIntroMedia;
  const hasItems = items.length > 0;
  const hasClosingButton =
    Boolean(closingButtonText.trim()) && Boolean(closingButtonLink.trim());
  const hasClosing = hasClosingButton || closingEmbed !== null;

  return (
    <>
      <OlivePageBand
        leading={
          <OliveBreadcrumb
            items={[
              { label: "Services", href: "/services" },
              { label: service.name },
            ]}
          />
        }
        title={service.name}
        intro={service.description}
        image={heroImage}
        video={heroVideo}
      />

      {hasIntro ? (
        <OlivePageSection
          flush={!hasCover}
          aria-label={introHeading || service.name}
        >
          <div
            className={
              hasIntroMedia
                ? "grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-16"
                : undefined
            }
          >
            <OliveReveal threshold={0} style={{ maxWidth: "68ch" }}>
              {introHeading ? (
                <h2 className="olive-h2" style={{ marginBottom: "1.25rem" }}>
                  {introHeading}
                </h2>
              ) : null}
              {hasIntroBody && introBodyJson ? (
                <TiptapRenderer
                  content={introBodyJson}
                  className="olive-prose"
                />
              ) : null}
            </OliveReveal>
            {hasIntroMedia ? (
              <OliveReveal threshold={0}>
                <ServiceSectionMedia
                  imageSrc={introImage}
                  videoSrc={introVideo}
                  alt={service.name}
                  className="aspect-[4/3] w-full"
                  style={{ border: "1px solid var(--olive-hairline)" }}
                />
              </OliveReveal>
            ) : null}
          </div>
        </OlivePageSection>
      ) : null}

      {hasItems ? (
        <OlivePageSection
          tone={hasIntro ? "paper" : "white"}
          flush={!hasIntro && !hasCover}
          aria-label={itemsHeading || "Appointments"}
        >
          {itemsHeading ? (
            <h2 className="olive-h2" style={{ marginBottom: "2rem" }}>
              {itemsHeading}
            </h2>
          ) : null}
          <OliveRevealGroup
            threshold={0}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {items.map((item, i) => (
              <OliveServiceItemCard
                key={item.id}
                item={item}
                index={i}
                bookLabel={bookLabel}
                embedsEnabled={embedsEnabled}
              />
            ))}
          </OliveRevealGroup>
        </OlivePageSection>
      ) : null}

      {hasClosing ? (
        <OliveClosingBand heading={closingHeading} body={closingBody}>
          {hasClosingButton ? (
            <OliveGatedButton
              href={closingButtonLink}
              label={closingButtonText}
              size="lg"
            />
          ) : null}

          {closingEmbed ? (
            embedsEnabled ? (
              closingEmbedReveal ? (
                <EmbedReveal
                  src={closingEmbed.src}
                  height={closingEmbed.height}
                  title={closingEmbed.title ?? "Book"}
                  triggerLabel={
                    closingEmbed.triggerLabel ?? closingEmbed.title ?? "Book"
                  }
                  triggerClassName={OLIVE_EMBED_TRIGGER_CLASS}
                  className="flex w-full flex-col items-center"
                  aspectRatio={closingEmbed.aspectRatio}
                  maxWidth={closingEmbed.maxWidth}
                />
              ) : closingEmbed.displayMode === "dialog" ? (
                <div
                  className="olive-shadcn-bridge"
                  style={OLIVE_BOOKING_TRIGGER_VARS}
                >
                  <EmbedDialog
                    src={closingEmbed.src}
                    title={closingEmbed.title ?? "Book"}
                    aspectRatio={closingEmbed.aspectRatio}
                    height={closingEmbed.height}
                    triggerLabel={
                      closingEmbed.triggerLabel ?? closingEmbed.title ?? "Book"
                    }
                    className={OLIVE_EMBED_TRIGGER_CLASS}
                  />
                </div>
              ) : (
                <div
                  className="olive-card w-full overflow-hidden"
                  style={{ maxWidth: closingEmbed.maxWidth ?? "56rem" }}
                >
                  <EmbedFrame
                    src={closingEmbed.src}
                    height={closingEmbed.height}
                    title={closingEmbed.title ?? "Book"}
                    className="w-full"
                    aspectRatio={closingEmbed.aspectRatio}
                    maxWidth={closingEmbed.maxWidth}
                  />
                </div>
              )
            ) : (
              <OliveButton
                variant="secondary"
                size="lg"
                href={closingEmbed.src}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open booking page
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only"> (opens in new tab)</span>
              </OliveButton>
            )
          ) : null}
        </OliveClosingBand>
      ) : null}
    </>
  );
}

function OliveServiceItemCard({
  item,
  index,
  bookLabel,
  embedsEnabled,
}: {
  item: ServiceItem;
  index: number;
  bookLabel: string;
  embedsEnabled: boolean;
}) {
  const tiers = parseServicePriceTiers(item.priceTiers);
  const addOns = parseServiceAddOns(item.addOns);
  const hasPriceRow =
    Boolean(item.priceLabel) ||
    Boolean(item.compareAtPriceLabel) ||
    Boolean(item.durationLabel);

  return (
    <article
      className="olive-card olive-reveal-item flex h-full flex-col overflow-hidden"
      style={{ "--i": Math.min(index, 8) } as CSSProperties}
    >
      {hasOliveImage(item.image) ? (
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={item.image!}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="olive-h3">{item.name}</h3>
          {item.isSignature ? (
            <span
              className="olive-label"
              style={{
                padding: "0.25rem 0.625rem",
                backgroundColor: "var(--olive-sage-tint)",
                borderRadius: "999px",
                color: "var(--olive-leaf)",
              }}
            >
              Signature
            </span>
          ) : null}
        </div>

        {item.category ? (
          <span className="olive-label">{item.category}</span>
        ) : null}

        {item.description ? (
          <p
            className="flex-1 text-[0.9375rem] leading-relaxed"
            style={{ color: "var(--olive-ink-soft)" }}
          >
            {item.description}
          </p>
        ) : null}

        {hasPriceRow ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {item.priceLabel ? (
              <span className="olive-price">{item.priceLabel}</span>
            ) : null}
            {item.compareAtPriceLabel ? (
              <span className="olive-caption line-through">
                {item.compareAtPriceLabel}
              </span>
            ) : null}
            {item.durationLabel ? (
              <span className="olive-caption inline-flex items-center gap-1">
                <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                {item.durationLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {tiers.length > 0 ? (
          <dl
            className="flex flex-col gap-1.5 text-[0.875rem]"
            style={{
              padding: "0.625rem 0.75rem",
              backgroundColor: "var(--olive-paper)",
              borderRadius: "var(--olive-card-radius)",
            }}
          >
            {tiers.map((tier: ServicePriceTier, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <dt style={{ color: "var(--olive-ink-soft)" }}>{tier.label}</dt>
                <dd className="flex items-center gap-1.5">
                  {tier.compareAtPriceLabel ? (
                    <span className="olive-caption line-through">
                      {tier.compareAtPriceLabel}
                    </span>
                  ) : null}
                  <span className="olive-price">{tier.priceLabel}</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {addOns.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <p className="olive-label">Add-ons</p>
            <ul className="flex flex-col gap-1.5 text-[0.875rem]">
              {addOns.map((addOn: ServiceAddOn, i: number) => (
                <li key={i}>
                  <span style={{ color: "var(--olive-ink)" }}>
                    {addOn.name}
                  </span>
                  {addOn.priceLabel ? (
                    <span style={{ color: "var(--olive-ink-soft)" }}>
                      {" "}
                      · {addOn.priceLabel}
                    </span>
                  ) : null}
                  {addOn.description ? (
                    <p className="olive-caption mt-0.5">{addOn.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div
          className="olive-shadcn-bridge mt-2 flex items-center justify-end"
          style={OLIVE_BOOKING_TRIGGER_VARS}
        >
          <ServiceBookingDialog
            triggerLabel={bookLabel}
            itemName={item.name}
            embedSrc={item.bookingEmbedSrc}
            embedHeight={item.bookingEmbedHeight}
            embedsEnabled={embedsEnabled}
          />
        </div>
      </div>
    </article>
  );
}
