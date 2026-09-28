import type { CSSProperties } from "react";
import Image from "next/image";

import type { ServiceTemplateProps } from "../../../_service-pages/registry";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { ServiceAddOn, ServicePriceTier } from "~/lib/validators/services";
import {
  isContentEmpty,
  parseTemplateIframeValue,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import {
  parseServiceAddOns,
  parseServicePriceTiers,
} from "~/lib/validators/services";
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
import { ServiceSectionMedia } from "../../../_service-pages/_shared/service-section-media";
import { NoiseClosingBand } from "../../generic/noise-closing-band";
import { NoiseGatedLink } from "../../generic/noise-gated-link";
import {
  NOISE_META_CLASS,
  NOISE_PROSE_CLASS,
  NoiseBackLink,
  NoisePageBand,
  NoisePageBody,
} from "../../generic/noise-page-shell";

type ServiceItem = ServiceTemplateProps["items"][number];

/**
 * The shared booking trigger (`ServiceBookingDialog`) is a shadcn `Button`
 * reading shadcn variables, which noise never remaps globally. Map them here
 * so the trigger prints as noise's square ink button. The dialog itself
 * portals outside `.noise` (known backlog — not styled here).
 */
const NOISE_BOOKING_TRIGGER_VARS = {
  "--primary": "var(--vn-ink)",
  "--primary-foreground": "var(--vn-bone)",
  "--background": "var(--vn-paper)",
  "--foreground": "var(--vn-ink)",
  "--input": "var(--vn-rule)",
  "--accent": "var(--vn-line-soft)",
  "--accent-foreground": "var(--vn-ink)",
  "--ring": "var(--vn-ink)",
  "--radius": "0px",
} as CSSProperties;

/** The closing band's bone-on-ink button, laid over the embed triggers. */
const NOISE_ON_DARK_BUTTON_CLASS =
  "vn-focus-on-dark inline-flex h-auto items-center gap-3 rounded-none border border-(--vn-bone) bg-(--vn-bone) px-8 py-3.5 font-mono text-[11px] tracking-[0.24em] text-(--vn-ink) uppercase shadow-none transition-opacity hover:bg-(--vn-bone) hover:opacity-80";

/** A real photo, not blank or the stock placeholder. */
function hasImage(src: string | null | undefined): src is string {
  const value = src?.trim();
  return !!value && !value.endsWith("/placeholder.svg");
}

/**
 * noise-template service detail page — `NoiseServicePage` (parity finding
 * PF13, package TP5), built on noise's generic page base.
 *
 * 1. `NoisePageBand`: a mono "← All services" back link, the service name as
 *    the page's only h1, its description as the intro.
 * 2. Header media: the blog post's wide ink-framed strip — the header video,
 *    else the header photo, else the service's own image. Skipped when none.
 * 3. Intro: heading + rich text in noise prose, optional photo/video beside
 *    it. Only when there is real text or media.
 * 4. Booking cards: one hairline paper card per service item — photo, name,
 *    signature stamp, category, price/compare-at/duration, price tiers,
 *    add-ons and the booking trigger — on the wide container.
 * 5. Closing (`NoiseClosingBand`): button and/or booking embed, rendered
 *    outside the fade (a booking form never starts hidden).
 *
 * Fields live on `Service.customFields` (admin service editor), so there is
 * no visual-editor wiring here — same as olive's, bamboo's and Default's
 * variants.
 */
export function NoiseServicePage({
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const f = resolveFields(service.customFields, [
    "noise-service.hero-image",
    "noise-service.hero-video",
    "noise-service.intro-heading",
    "noise-service.intro-body",
    "noise-service.intro-image",
    "noise-service.intro-video",
    "noise-service.items-heading",
    "noise-service.book-label",
    "noise-service.closing-heading",
    "noise-service.closing-body",
    "noise-service.closing-button-text",
    "noise-service.closing-button-link",
    "noise-service.closing-embed",
    "noise-service.closing-embed-reveal",
  ]);

  const heroVideo = (f["noise-service.hero-video"] ?? "").trim();
  const heroImageField = f["noise-service.hero-image"] ?? "";
  const heroImage = hasImage(heroImageField)
    ? heroImageField
    : hasImage(service.image)
      ? service.image
      : "";
  const hasHeaderMedia = Boolean(heroVideo) || Boolean(heroImage);

  const introHeading = (f["noise-service.intro-heading"] ?? "").trim();
  const introBodyRaw = f["noise-service.intro-body"];
  const introImageField = f["noise-service.intro-image"] ?? "";
  const introImage = hasImage(introImageField) ? introImageField : "";
  const introVideo = (f["noise-service.intro-video"] ?? "").trim();

  const itemsHeading = (f["noise-service.items-heading"] ?? "").trim();
  const bookLabel = (f["noise-service.book-label"] ?? "").trim() || "Book";

  const closingHeading = f["noise-service.closing-heading"] ?? "";
  const closingBody = f["noise-service.closing-body"] ?? "";
  const closingButtonText = f["noise-service.closing-button-text"] ?? "";
  const closingButtonLink = f["noise-service.closing-button-link"] ?? "";
  const closingEmbed = parseTemplateIframeValue(
    f["noise-service.closing-embed"],
  );
  const closingEmbedReveal = f["noise-service.closing-embed-reveal"] === "true";

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
  // "What to expect" block for every service without intro copy — require
  // real body content or media.
  const hasIntro = hasIntroBody || hasIntroMedia;
  const hasItems = items.length > 0;
  const hasClosingButton =
    Boolean(closingButtonText.trim()) && Boolean(closingButtonLink.trim());
  const hasClosing = hasClosingButton || closingEmbed !== null;

  return (
    <PageTransition>
      <NoisePageBand
        leading={<NoiseBackLink href="/services">← All services</NoiseBackLink>}
        title={service.name}
        intro={service.description}
      />

      {hasHeaderMedia ? (
        <NoisePageBody width="wide">
          <ServiceSectionMedia
            imageSrc={heroImage || undefined}
            videoSrc={heroVideo || undefined}
            alt={service.name}
            rounded={false}
            className="aspect-[4/3] w-full border border-(--vn-ink) sm:aspect-[21/9]"
          />
        </NoisePageBody>
      ) : null}

      {hasIntro ? (
        <NoisePageBody
          width={hasIntroMedia ? "wide" : "measure"}
          aria-label={introHeading || service.name}
        >
          <FadeIn
            className={cn(
              "border-t-2 border-(--vn-ink) pt-12",
              hasIntroMedia &&
                "mx-auto grid max-w-[1040px] grid-cols-1 items-start gap-10 md:grid-cols-2 md:gap-14",
            )}
          >
            <div className="min-w-0" style={{ maxWidth: "68ch" }}>
              {introHeading ? (
                <h2
                  className="mb-6 font-serif leading-none tracking-tight italic"
                  style={{
                    fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {introHeading}
                </h2>
              ) : null}
              {hasIntroBody && introBodyJson ? (
                <TiptapRenderer
                  content={introBodyJson}
                  className={NOISE_PROSE_CLASS}
                />
              ) : null}
            </div>
            {hasIntroMedia ? (
              <ServiceSectionMedia
                imageSrc={introImage || undefined}
                videoSrc={introVideo || undefined}
                alt={service.name}
                rounded={false}
                className="aspect-[4/3] w-full border border-(--vn-ink)"
              />
            ) : null}
          </FadeIn>
        </NoisePageBody>
      ) : null}

      {hasItems ? (
        <NoisePageBody width="wide" aria-label={itemsHeading || "Book"}>
          <div className="mb-10 flex items-end justify-between gap-6 border-b-2 border-(--vn-ink) pb-6">
            {itemsHeading ? (
              <h2
                className="font-serif leading-none tracking-tight italic"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3.2rem)",
                  letterSpacing: "-0.02em",
                }}
              >
                {itemsHeading}
              </h2>
            ) : (
              <span />
            )}
            <span className={cn("hidden md:block", NOISE_META_CLASS)}>
              {items.length} {items.length === 1 ? "option" : "options"}
            </span>
          </div>
          <StaggerContainer
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.07}
          >
            {items.map((item) => (
              <StaggerItem key={item.id} className="min-w-0">
                <NoiseServiceItemCard
                  item={item}
                  bookLabel={bookLabel}
                  embedsEnabled={embedsEnabled}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </NoisePageBody>
      ) : null}

      {hasClosing ? (
        <NoiseClosingBand heading={closingHeading} body={closingBody}>
          {hasClosingButton ? (
            <NoiseGatedLink
              href={closingButtonLink}
              label={closingButtonText}
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
                  triggerClassName={NOISE_ON_DARK_BUTTON_CLASS}
                  className="flex w-full flex-col items-center"
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
                    closingEmbed.triggerLabel ?? closingEmbed.title ?? "Book"
                  }
                  className={NOISE_ON_DARK_BUTTON_CLASS}
                />
              ) : (
                <div
                  className="w-full overflow-hidden border border-(--vn-bone) bg-(--vn-paper)"
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
              <a
                href={closingEmbed.src}
                target="_blank"
                rel="noopener noreferrer"
                className={NOISE_ON_DARK_BUTTON_CLASS}
              >
                Open booking page
                <span aria-hidden="true">↗</span>
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            )
          ) : null}
        </NoiseClosingBand>
      ) : null}
    </PageTransition>
  );
}

function NoiseServiceItemCard({
  item,
  bookLabel,
  embedsEnabled,
}: {
  item: ServiceItem;
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
    <article className="flex h-full flex-col border border-(--vn-rule) bg-(--vn-paper)">
      {hasImage(item.image) ? (
        <div className="relative aspect-video w-full overflow-hidden border-b border-(--vn-rule)">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3
            className="font-serif leading-[1.15] tracking-tight break-words italic"
            style={{ fontSize: "24px", letterSpacing: "-0.005em" }}
          >
            {item.name}
          </h3>
          {item.isSignature ? (
            <span className="vn-stamp vn-stamp-solid">Signature</span>
          ) : null}
        </div>

        {item.category ? (
          <span className={NOISE_META_CLASS}>{item.category}</span>
        ) : null}

        {item.description ? (
          <p className="flex-1 font-sans text-[14px] leading-[1.75] text-(--vn-ink-soft)">
            {item.description}
          </p>
        ) : null}

        {hasPriceRow ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[12px] tracking-[0.14em] uppercase">
            {item.priceLabel ? (
              <span className="text-(--vn-ink)">{item.priceLabel}</span>
            ) : null}
            {item.compareAtPriceLabel ? (
              <span className="text-(--vn-steel-mist) line-through">
                {item.compareAtPriceLabel}
              </span>
            ) : null}
            {item.durationLabel ? (
              <span className="text-(--vn-steel-mist)">
                · {item.durationLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {tiers.length > 0 ? (
          <dl className="flex flex-col gap-1.5 border-y border-(--vn-line-soft) py-3 text-[13px]">
            {tiers.map((tier: ServicePriceTier, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <dt className="font-sans text-(--vn-ink-soft)">{tier.label}</dt>
                <dd className="flex items-center gap-1.5 font-mono tracking-[0.1em]">
                  {tier.compareAtPriceLabel ? (
                    <span className="text-(--vn-steel-mist) line-through">
                      {tier.compareAtPriceLabel}
                    </span>
                  ) : null}
                  <span className="text-(--vn-ink)">{tier.priceLabel}</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {addOns.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <p className={NOISE_META_CLASS}>Add-ons</p>
            <ul className="flex flex-col gap-1.5 font-sans text-[13px]">
              {addOns.map((addOn: ServiceAddOn, i: number) => (
                <li key={i}>
                  <span className="text-(--vn-ink)">{addOn.name}</span>
                  {addOn.priceLabel ? (
                    <span className="text-(--vn-ink-soft)">
                      {" "}
                      · {addOn.priceLabel}
                    </span>
                  ) : null}
                  {addOn.description ? (
                    <p className="mt-0.5 text-(--vn-steel-mist)">
                      {addOn.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div
          className="mt-2 flex items-center justify-end"
          style={NOISE_BOOKING_TRIGGER_VARS}
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
