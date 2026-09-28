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
import { PageTransition } from "~/components/page-animations";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from ".";
import { UmscGatedLink } from "../../generic/umsc-gated-link";
import {
  UMSC_META_CLASS,
  UmscBackLink,
  UmscClosingBand,
} from "../../generic/umsc-page-kit";
import {
  UMSC_EMBED_STYLE,
  UMSC_EMBED_VARS,
  UMSC_PROSE_CLASSNAME,
} from "../../generic/umsc-prose";
import { UmscHeading } from "../../shared/umsc-heading";
import { hasCustomImage } from "../../shared/umsc-image-fallback";
import { UmscPageHero } from "../../shared/umsc-page-hero";
import { UmscReveal, UmscRevealGroup } from "../../shared/umsc-reveal";
import { UmscSection } from "../../shared/umsc-section";

type ServiceItem = ServiceTemplateProps["items"][number];

/**
 * The shared booking trigger (`ServiceBookingDialog`) is a shadcn `Button`
 * reading shadcn variables. Map them here so the trigger prints as umsc's
 * gold pill (near-black text on gold, 7.2:1) and the disabled/outline
 * fallback as a hairline pill. The dialog itself portals to `body`, outside
 * `.umsc` (known platform backlog — not styled here).
 */
const UMSC_BOOKING_TRIGGER_VARS = {
  "--primary": "var(--umsc-gold)",
  "--primary-foreground": "var(--umsc-black)",
  "--background": "var(--umsc-white)",
  "--foreground": "var(--umsc-ink)",
  "--input": "var(--umsc-line)",
  "--accent": "var(--umsc-cream)",
  "--accent-foreground": "var(--umsc-ink)",
  "--ring": "var(--umsc-purple)",
  "--radius": "var(--umsc-radius-pill)",
} as CSSProperties;

/** Embed triggers laid over the black closing band — the gold pill. */
const UMSC_EMBED_TRIGGER_CLASS = "umsc-btn umsc-btn-gold";

/**
 * umsc-template service detail page — `UmscServicePage` (parity PF24),
 * built on umsc's generic page base.
 *
 * 1. The black `UmscPageHero` at detail scale: "← All services", the
 *    service name as the page's only h1, its description as the lede.
 * 2. One body section on the shared container (one left edge, B1.7):
 *    - the wide hairline-framed photo (header field, else the service's own
 *      image) — a strip rather than the band's desktop-only image slot, so it
 *      shows on phones too;
 *    - intro: heading + rich text in the umsc prose system at 66ch, optional
 *      photo beside it — only when there is real text or a photo;
 *    - option cards: one white hairline card per service item — photo,
 *      name, purple "Signature" badge, category, gold-ink price /
 *      compare-at / duration, price tiers, add-ons and the booking trigger.
 * 3. `UmscClosingBand`: a flag-gated button and/or a booking embed.
 *
 * Fields live on `Service.customFields` (admin service editor), so there is
 * no visual-editor wiring here — same as noise's, olive's and Default's
 * variants.
 */
export function UmscServicePage({
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const f = resolveFields(service.customFields, [
    "umsc-service.hero-image",
    "umsc-service.intro-heading",
    "umsc-service.intro-body",
    "umsc-service.intro-image",
    "umsc-service.items-heading",
    "umsc-service.book-label",
    "umsc-service.closing-heading",
    "umsc-service.closing-body",
    "umsc-service.closing-button-text",
    "umsc-service.closing-button-link",
    "umsc-service.closing-embed",
    "umsc-service.closing-embed-reveal",
  ]);

  const heroImageField = f["umsc-service.hero-image"] ?? "";
  const heroImage = hasCustomImage(heroImageField)
    ? heroImageField
    : hasCustomImage(service.image)
      ? service.image!
      : "";

  const introHeading = (f["umsc-service.intro-heading"] ?? "").trim();
  const introBodyRaw = f["umsc-service.intro-body"];
  const introImageField = f["umsc-service.intro-image"] ?? "";
  const introImage = hasCustomImage(introImageField) ? introImageField : "";

  const itemsHeading = (f["umsc-service.items-heading"] ?? "").trim();
  const bookLabel = (f["umsc-service.book-label"] ?? "").trim() || "Book";

  const closingEmbed = parseTemplateIframeValue(
    f["umsc-service.closing-embed"],
  );
  const closingEmbedReveal = f["umsc-service.closing-embed-reveal"] === "true";
  const closingButtonText = f["umsc-service.closing-button-text"] ?? "";
  const closingButtonLink = f["umsc-service.closing-button-link"] ?? "";

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

  const hasIntroBody = introBodyJson !== null && !isContentEmpty(introBodyJson);
  // The heading has a default value, so on its own it would render an empty
  // "What to expect" block for every service without intro copy — require
  // real body content or a photo.
  const hasIntro = hasIntroBody || !!introImage;
  const hasItems = items.length > 0;
  const hasBody = !!heroImage || hasIntro || hasItems;
  const hasClosingButton =
    !!closingButtonText.trim() && !!closingButtonLink.trim();
  const hasClosing = hasClosingButton || closingEmbed !== null;

  return (
    <PageTransition>
      <style>{UMSC_EMBED_STYLE}</style>

      <UmscPageHero
        compact
        leading={<UmscBackLink href="/services">All services</UmscBackLink>}
        heading={service.name}
        lede={service.description ?? undefined}
      />

      {hasBody ? (
        <UmscSection tone="paper" aria-label={service.name}>
          <div className="flex flex-col gap-16 lg:gap-20">
            {heroImage ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden border border-[var(--umsc-line)] sm:aspect-[21/9]">
                <Image
                  src={heroImage}
                  alt=""
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1280px) 100vw, 1280px"
                />
              </div>
            ) : null}

            {hasIntro ? (
              <UmscReveal
                className={cn(
                  introImage &&
                    "grid grid-cols-1 items-start gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] md:gap-14",
                )}
              >
                <div className="min-w-0">
                  {introHeading ? (
                    <UmscHeading as="h2" className="mb-6">
                      {introHeading}
                    </UmscHeading>
                  ) : null}
                  {hasIntroBody && introBodyJson ? (
                    <div className="umsc-embed" style={UMSC_EMBED_VARS}>
                      <TiptapRenderer
                        content={introBodyJson}
                        className={UMSC_PROSE_CLASSNAME}
                      />
                    </div>
                  ) : null}
                </div>
                {introImage ? (
                  <div className="relative aspect-[4/5] w-full overflow-hidden border border-[var(--umsc-line)]">
                    <Image
                      src={introImage}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 480px"
                    />
                  </div>
                ) : null}
              </UmscReveal>
            ) : null}

            {hasItems ? (
              <div className="flex flex-col gap-10">
                <div className="flex items-end justify-between gap-6 border-b border-[var(--umsc-line)] pb-6">
                  {itemsHeading ? (
                    <UmscHeading as="h2">{itemsHeading}</UmscHeading>
                  ) : (
                    <span />
                  )}
                  <span
                    className={cn(
                      UMSC_META_CLASS,
                      "umsc-tabular hidden text-[var(--umsc-muted)] md:block",
                    )}
                  >
                    {items.length} {items.length === 1 ? "option" : "options"}
                  </span>
                </div>
                <UmscRevealGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item, i) => (
                    <div
                      key={item.id}
                      className="umsc-reveal-item min-w-0"
                      style={{ "--i": Math.min(i, 6) } as CSSProperties}
                    >
                      <UmscServiceItemCard
                        item={item}
                        bookLabel={bookLabel}
                        embedsEnabled={embedsEnabled}
                        headingLevel={itemsHeading ? "h3" : "h2"}
                      />
                    </div>
                  ))}
                </UmscRevealGroup>
              </div>
            ) : null}
          </div>
        </UmscSection>
      ) : null}

      {hasClosing ? (
        <UmscClosingBand
          heading={f["umsc-service.closing-heading"] ?? ""}
          body={f["umsc-service.closing-body"]}
        >
          {hasClosingButton ? (
            <UmscGatedLink href={closingButtonLink} label={closingButtonText} />
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
                  triggerClassName={UMSC_EMBED_TRIGGER_CLASS}
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
                  className={UMSC_EMBED_TRIGGER_CLASS}
                />
              ) : (
                <div
                  className="w-full overflow-hidden border border-[var(--umsc-line-gold)] bg-[var(--umsc-paper)]"
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
                className={UMSC_EMBED_TRIGGER_CLASS}
              >
                Open booking page
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            )
          ) : null}
        </UmscClosingBand>
      ) : null}
    </PageTransition>
  );
}

function UmscServiceItemCard({
  item,
  bookLabel,
  embedsEnabled,
  headingLevel,
}: {
  item: ServiceItem;
  bookLabel: string;
  embedsEnabled: boolean;
  headingLevel: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const tiers = parseServicePriceTiers(item.priceTiers);
  const addOns = parseServiceAddOns(item.addOns);
  const hasPriceRow =
    !!item.priceLabel || !!item.compareAtPriceLabel || !!item.durationLabel;

  return (
    <article className="flex h-full flex-col border border-[var(--umsc-line)] bg-[var(--umsc-white)]">
      {hasCustomImage(item.image) ? (
        <div className="relative aspect-video w-full overflow-hidden border-b border-[var(--umsc-line)]">
          <Image
            src={item.image!}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Heading className="umsc-sans text-[18px] leading-[1.3] font-semibold tracking-[-0.02em] break-words text-[var(--umsc-ink)]">
            {item.name}
          </Heading>
          {item.isSignature ? (
            <span className="umsc-sans rounded-[var(--umsc-radius-pill)] bg-[var(--umsc-purple)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.1em] text-[var(--umsc-white)] uppercase">
              Signature
            </span>
          ) : null}
        </div>

        {item.category ? (
          <span className={cn(UMSC_META_CLASS, "text-[var(--umsc-muted)]")}>
            {item.category}
          </span>
        ) : null}

        {item.description ? (
          <p className="umsc-sans flex-1 text-[15px] leading-[1.6] text-[var(--umsc-muted)]">
            {item.description}
          </p>
        ) : null}

        {hasPriceRow ? (
          <div className="umsc-sans umsc-tabular flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[15px]">
            {item.priceLabel ? (
              <span className="font-semibold text-[var(--umsc-gold-ink)]">
                {item.priceLabel}
              </span>
            ) : null}
            {item.compareAtPriceLabel ? (
              <span className="text-[var(--umsc-muted)] line-through">
                {item.compareAtPriceLabel}
              </span>
            ) : null}
            {item.durationLabel ? (
              <span className="text-[var(--umsc-muted)]">
                · {item.durationLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {tiers.length > 0 ? (
          <dl className="umsc-sans flex flex-col gap-1.5 border-y border-[var(--umsc-line)] py-3 text-[14px]">
            {tiers.map((tier: ServicePriceTier, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <dt className="text-[var(--umsc-muted)]">{tier.label}</dt>
                <dd className="umsc-tabular flex items-center gap-1.5">
                  {tier.compareAtPriceLabel ? (
                    <span className="text-[var(--umsc-muted)] line-through">
                      {tier.compareAtPriceLabel}
                    </span>
                  ) : null}
                  <span className="font-semibold text-[var(--umsc-gold-ink)]">
                    {tier.priceLabel}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {addOns.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <p className={cn(UMSC_META_CLASS, "text-[var(--umsc-muted)]")}>
              Add-ons
            </p>
            <ul className="umsc-sans flex flex-col gap-1.5 text-[14px]">
              {addOns.map((addOn: ServiceAddOn, i: number) => (
                <li key={i}>
                  <span className="text-[var(--umsc-ink)]">{addOn.name}</span>
                  {addOn.priceLabel ? (
                    <span className="umsc-tabular text-[var(--umsc-muted)]">
                      {" "}
                      · {addOn.priceLabel}
                    </span>
                  ) : null}
                  {addOn.description ? (
                    <p className="mt-0.5 text-[var(--umsc-muted)]">
                      {addOn.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div
          className="umsc-sans mt-2 flex items-center justify-end"
          style={UMSC_BOOKING_TRIGGER_VARS}
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
