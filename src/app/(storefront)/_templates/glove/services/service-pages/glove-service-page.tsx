import type { CSSProperties } from "react";
import Image from "next/image";
import { Clock } from "lucide-react";

import type { ServiceTemplateProps } from "../../../_service-pages/registry";
import type { ServiceAddOn, ServicePriceTier } from "~/lib/validators/services";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { parseTemplateIframeValue } from "~/lib/template-fields";
import {
  parseServiceAddOns,
  parseServicePriceTiers,
} from "~/lib/validators/services";
import { EmbedDialog } from "~/components/embed-dialog";
import { EmbedFrame } from "~/components/embed-frame";
import { EmbedReveal } from "~/components/embed-reveal";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";

import { resolveFields } from ".";
import { resolveFields as resolveGloveFields } from "../..";
import { ServiceSectionMedia } from "../../../_service-pages/_shared/service-section-media";
import { GloveGeneralLayout } from "../../generic/glove-general-layout";
import { GloveProse, hasProseContent } from "../../generic/glove-prose";
import {
  GloveButton,
  gloveButtonClass,
  GloveHeading,
  GloveReveal,
  GloveRevealGroup,
  gloveRevealItemStyle,
  GloveSection,
} from "../../shared";
import { gloveIsExternal, gloveLinkAllowed } from "../../steps/glove-links";
import { hasGloveImage } from "../has-glove-image";

type ServiceItem = ServiceTemplateProps["items"][number];

/**
 * The shared booking trigger (`ServiceBookingDialog`) and `EmbedDialog` are
 * shadcn `Button`s reading shadcn variables; map them onto glove's purple
 * button. The dialog itself portals outside `.glove` (platform styling).
 */
const GLOVE_BOOKING_TRIGGER_VARS = {
  "--primary": "var(--glove-primary)",
  "--primary-foreground": "var(--glove-on-primary)",
  "--accent": "var(--glove-mist)",
  "--accent-foreground": "var(--glove-primary)",
  "--background": "var(--glove-paper)",
  "--foreground": "var(--glove-ink)",
  "--input": "var(--glove-line)",
  "--border": "var(--glove-line)",
  "--ring": "var(--glove-primary)",
  "--radius": "var(--glove-radius-btn)",
} as CSSProperties;

/** Glove's white-outline Woo button for triggers on the purple banner. */
const GLOVE_BANNER_TRIGGER_CLASS = gloveButtonClass({
  variant: "woo",
  size: "lg",
  onDark: true,
});

/**
 * glove-template service detail page — `GloveServicePage` (parity finding
 * PF2, package TP2), on glove's generic page base.
 *
 * 1. `GloveGeneralLayout`: plum title band (service name = the page's only
 *    h1, its description as the sub-line) + breadcrumb Home / Services /
 *    this service.
 * 2. Feature (white): photo or video (field, else the service's own image)
 *    beside the intro heading + rich text. Photo only → one wide 12px-radius
 *    photo across the container; text only → a centered 860px column.
 *    Hidden when there is neither.
 * 3. Options (mist band): one white hairline card per published service
 *    item — photo, name, category, price / compare-at / duration, price
 *    tiers, add-ons and the platform booking trigger on glove's purple.
 * 4. Closing banner (purple): heading, line, a flag-gated button (B2.5) and/or
 *    the booking embed. The embed renders outside any reveal (a booking form
 *    never starts hidden).
 *
 * Every section sits on the 1222px container edge. Fields live on
 * `Service.customFields` (admin service editor), so there is no
 * visual-editor wiring here — same as olive's, bamboo's and Default's.
 */
export async function GloveServicePage({
  business,
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const f = resolveFields(service.customFields, [
    "glove-service.feature-image",
    "glove-service.feature-video",
    "glove-service.intro-heading",
    "glove-service.intro-body",
    "glove-service.items-heading",
    "glove-service.book-label",
    "glove-service.closing-heading",
    "glove-service.closing-body",
    "glove-service.closing-button-text",
    "glove-service.closing-button-link",
    "glove-service.closing-embed",
    "glove-service.closing-embed-reveal",
  ]);
  const get = (key: string) => f[key] ?? "";

  // The index page's heading names the breadcrumb's middle crumb.
  const servicesLabel =
    (
      resolveGloveFields(business.siteContent?.customFields, [
        "glove.services.hero-heading",
      ])["glove.services.hero-heading"] ?? ""
    ).trim() || "Services";

  // ── Feature ────────────────────────────────────────────────────────────
  const featureVideo = get("glove-service.feature-video").trim();
  const featureImageField = get("glove-service.feature-image");
  const featureImage = hasGloveImage(featureImageField)
    ? featureImageField
    : hasGloveImage(service.image)
      ? service.image
      : "";
  const hasMedia = featureVideo.length > 0 || featureImage.length > 0;

  const introHeading = get("glove-service.intro-heading").trim();
  // Rich text is stored as a string-encoded Tiptap doc.
  let introBody: unknown = null;
  const introBodyRaw = get("glove-service.intro-body");
  if (introBodyRaw) {
    try {
      introBody = JSON.parse(introBodyRaw) as unknown;
    } catch {
      introBody = null;
    }
  }
  const hasIntro = introBody !== null && hasProseContent(introBody);
  const hasFeature = hasMedia || hasIntro;

  // ── Options ────────────────────────────────────────────────────────────
  const itemsHeading = get("glove-service.items-heading").trim();
  const bookLabel = get("glove-service.book-label").trim() || "Book Now";

  // ── Closing ────────────────────────────────────────────────────────────
  const { isEnabled } = await getBusinessFlags();
  const closingHeading = get("glove-service.closing-heading").trim();
  const closingBody = get("glove-service.closing-body").trim();
  const closingButtonText = get("glove-service.closing-button-text").trim();
  const closingButtonLink = get("glove-service.closing-button-link").trim();
  const hasClosingButton =
    closingButtonText.length > 0 &&
    gloveLinkAllowed(closingButtonLink, isEnabled);
  const closingEmbed = parseTemplateIframeValue(
    f["glove-service.closing-embed"],
  );
  const closingEmbedReveal =
    get("glove-service.closing-embed-reveal") === "true";
  const hasClosing = hasClosingButton || closingEmbed !== null;

  const media = hasMedia ? (
    <ServiceSectionMedia
      imageSrc={featureImage}
      videoSrc={featureVideo}
      alt={service.name}
      rounded={false}
      className={
        hasIntro
          ? "aspect-[4/5] w-full rounded-[12px] [box-shadow:var(--glove-shadow-md)]"
          : "aspect-[4/3] w-full rounded-[12px] [box-shadow:var(--glove-shadow-md)] md:aspect-[21/9]"
      }
    />
  ) : null;

  const intro = hasIntro ? (
    <div>
      {introHeading ? (
        <GloveHeading as="h2" align="left" className="mb-5">
          {introHeading}
        </GloveHeading>
      ) : null}
      <GloveProse content={introBody} />
    </div>
  ) : null;

  return (
    <GloveGeneralLayout
      bandVariant="plum"
      title={service.name}
      subtitle={service.description ?? ""}
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: servicesLabel, href: "/services" },
        { label: service.name },
      ]}
    >
      {hasFeature ? (
        // No reveal on the text: rich text can embed forms.
        <GloveSection
          tone="paper"
          aria-label={(hasIntro && introHeading) || service.name}
          reveal={false}
        >
          {media && intro ? (
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
              <GloveReveal threshold={0}>{media}</GloveReveal>
              {intro}
            </div>
          ) : media ? (
            <GloveReveal threshold={0}>{media}</GloveReveal>
          ) : (
            <div className="mx-auto max-w-[860px]">{intro}</div>
          )}
        </GloveSection>
      ) : null}

      {items.length > 0 ? (
        <GloveSection
          tone={hasFeature ? "mist" : "paper"}
          aria-label={itemsHeading || service.name}
          reveal={false}
        >
          {itemsHeading ? (
            <GloveHeading as="h2" className="mb-10 md:mb-12">
              {itemsHeading}
            </GloveHeading>
          ) : null}
          <GloveRevealGroup
            threshold={0}
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            {items.map((item, i) => (
              <GloveServiceItemCard
                key={item.id}
                item={item}
                index={i}
                bookLabel={bookLabel}
                embedsEnabled={embedsEnabled}
              />
            ))}
          </GloveRevealGroup>
        </GloveSection>
      ) : null}

      {hasClosing ? (
        <GloveSection
          tone="primary"
          aria-label={closingHeading || service.name}
          reveal={false}
        >
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            {closingHeading || closingBody ? (
              <GloveReveal threshold={0}>
                {closingHeading ? (
                  <GloveHeading as="h2" tone="light">
                    {closingHeading}
                  </GloveHeading>
                ) : null}
                {closingBody ? (
                  <p className="glove-body mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--glove-on-plum-soft)] md:text-[18px]">
                    {closingBody}
                  </p>
                ) : null}
              </GloveReveal>
            ) : null}

            {hasClosingButton ? (
              <div className="mt-8">
                <GloveButton
                  href={closingButtonLink}
                  external={gloveIsExternal(closingButtonLink)}
                  variant="woo"
                  size="lg"
                  onDark
                >
                  {closingButtonText}
                </GloveButton>
              </div>
            ) : null}

            {closingEmbed ? (
              <div className="mt-8 flex w-full justify-center">
                {embedsEnabled ? (
                  closingEmbedReveal ? (
                    <EmbedReveal
                      src={closingEmbed.src}
                      height={closingEmbed.height}
                      title={closingEmbed.title ?? "Book"}
                      triggerLabel={
                        closingEmbed.triggerLabel ??
                        closingEmbed.title ??
                        "Book"
                      }
                      triggerClassName={GLOVE_BANNER_TRIGGER_CLASS}
                      className="flex w-full flex-col items-center"
                      aspectRatio={closingEmbed.aspectRatio}
                      maxWidth={closingEmbed.maxWidth}
                    />
                  ) : closingEmbed.displayMode === "dialog" ? (
                    <div style={GLOVE_BOOKING_TRIGGER_VARS}>
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
                        className={GLOVE_BANNER_TRIGGER_CLASS}
                      />
                    </div>
                  ) : (
                    <div
                      className="w-full overflow-hidden rounded-[12px] bg-[var(--glove-paper)] [box-shadow:var(--glove-shadow-md)]"
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
                  <GloveButton
                    href={closingEmbed.src}
                    external
                    variant="woo"
                    size="lg"
                    onDark
                  >
                    {closingEmbed.triggerLabel ?? "Open booking page"}
                  </GloveButton>
                )}
              </div>
            ) : null}
          </div>
        </GloveSection>
      ) : null}
    </GloveGeneralLayout>
  );
}

function GloveServiceItemCard({
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
      className="glove-reveal-item flex h-full flex-col overflow-hidden rounded-[12px] border border-[var(--glove-line)] bg-[var(--glove-paper)] [box-shadow:var(--glove-shadow-sm)]"
      style={gloveRevealItemStyle(index)}
    >
      {hasGloveImage(item.image) ? (
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-[var(--glove-mist)]">
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
          <h3 className="glove-display text-[20px] leading-[1.3] font-medium text-[var(--glove-ink)]">
            {item.name}
          </h3>
          {item.isSignature ? (
            <span className="glove-display inline-flex items-center rounded-full bg-[var(--glove-mist)] px-3 py-1 text-[11px] font-semibold tracking-[1px] text-[var(--glove-primary)] uppercase">
              Signature
            </span>
          ) : null}
        </div>

        {item.category ? (
          <p className="glove-display text-[12px] font-medium tracking-[2px] text-[var(--glove-muted)] uppercase">
            {item.category}
          </p>
        ) : null}

        {item.description ? (
          <p className="glove-body flex-1 text-[15px] leading-relaxed text-[var(--glove-text)]">
            {item.description}
          </p>
        ) : null}

        {hasPriceRow ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {item.priceLabel ? (
              <span className="glove-body text-[18px] font-bold text-[var(--glove-primary)]">
                {item.priceLabel}
              </span>
            ) : null}
            {item.compareAtPriceLabel ? (
              <span className="glove-body text-[15px] text-[var(--glove-muted)] line-through">
                <span className="sr-only">Was </span>
                {item.compareAtPriceLabel}
              </span>
            ) : null}
            {item.durationLabel ? (
              <span className="glove-body inline-flex items-center gap-1 text-[14px] text-[var(--glove-muted)]">
                <Clock aria-hidden="true" className="size-3.5" />
                {item.durationLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        {tiers.length > 0 ? (
          <dl className="glove-body flex flex-col gap-1.5 rounded-[8px] bg-[var(--glove-mist)] px-3.5 py-3 text-[14px]">
            {tiers.map((tier: ServicePriceTier, i: number) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <dt className="text-[var(--glove-text)]">{tier.label}</dt>
                <dd className="flex items-center gap-1.5">
                  {tier.compareAtPriceLabel ? (
                    <span className="text-[var(--glove-muted)] line-through">
                      <span className="sr-only">Was </span>
                      {tier.compareAtPriceLabel}
                    </span>
                  ) : null}
                  <span className="font-bold text-[var(--glove-primary)]">
                    {tier.priceLabel}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {addOns.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <p className="glove-display text-[12px] font-medium tracking-[2px] text-[var(--glove-muted)] uppercase">
              Add-ons
            </p>
            <ul className="glove-body flex flex-col gap-1.5 text-[14px]">
              {addOns.map((addOn: ServiceAddOn, i: number) => (
                <li key={i}>
                  <span className="text-[var(--glove-ink)]">{addOn.name}</span>
                  {addOn.priceLabel ? (
                    <span className="text-[var(--glove-muted)]">
                      {" "}
                      · {addOn.priceLabel}
                    </span>
                  ) : null}
                  {addOn.description ? (
                    <p className="mt-0.5 text-[13px] text-[var(--glove-muted)]">
                      {addOn.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div
          className="glove-body mt-auto flex items-center justify-start pt-2"
          style={GLOVE_BOOKING_TRIGGER_VARS}
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
