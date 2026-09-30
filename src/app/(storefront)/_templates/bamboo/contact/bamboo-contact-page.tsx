"use client";

import { Clock, Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import {
  googleMapsUrls,
  resolveMapCoordinates,
} from "~/lib/address/coordinates";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getRawCustomFieldString,
  resolveFaqPickerItems,
} from "~/lib/template-fields";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import {
  BambooAccordion,
  BambooAccordionItem,
} from "../shared/bamboo-accordion";
import { BambooMap } from "../shared/bamboo-map";
import { BambooPageHero } from "../shared/bamboo-page-hero";
import { BambooContactForm } from "./bamboo-contact-form";

// Eyebrow-over-serif-h2 rhythm (docs/templates/bamboo/design.md "Section
// rhythm"). These labels are decorative -- not bound to any field.
const eyebrowClass =
  "mb-3 block text-sm font-semibold tracking-widest text-[var(--bam-gold)] uppercase";
const iconCircleClass =
  "flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--bam-gold)]/40";

export function BambooContactPage({
  business,
  faqItems,
}: DefaultContactPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "bamboo.contact.header",
    "bamboo.contact.subheader",
    "bamboo.contact.hero-image",
    "bamboo.contact.form-success-heading",
    "bamboo.contact.form-success-body",
    "bamboo.contact.map-eyebrow",
    "bamboo.contact.map-heading",
    "bamboo.contact.faq-eyebrow",
    "bamboo.contact.faq-heading",
    "bamboo.contact.faq-lede",
    "bamboo.contact.hero-bg-image",
    "bamboo.global.page-hero-bg-image",
  ]);

  // A cleared override saves as "" and must also fall back to the global
  // field, not just null/undefined.
  const heroBgImage =
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    f["bamboo.contact.hero-bg-image"] || f["bamboo.global.page-hero-bg-image"];

  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const faq = resolveFaqPickerItems(
    customFields?.["bamboo.contact.faq"],
    faqItems,
    10,
  );

  const email = business?.supportEmail?.trim();
  const location = business?.businessAddress?.trim();
  const phone = business?.phoneNumber?.trim();

  // Hours: Settings → Business Hours wins (rendered as compact label/value
  // rows); else the legacy saved single-line text (retired 2026-09-25, a
  // read-only fallback — never written or cleared from here); else omitted.
  const hoursRows = formatBusinessHours(
    parseBusinessHours(business?.businessHours),
  );
  const legacyHours = getRawCustomFieldString(
    business?.siteContent?.customFields,
    "bamboo.contact.hours",
  )?.trim();

  // Map pin: Settings → General (Business.latitude/longitude) wins. The
  // legacy per-template fields are a read-only fallback for sites that saved
  // coordinates before the pin moved to Settings (retired 2026-09-25) — the
  // saved values are never written to or cleared from here.
  const coords = resolveMapCoordinates(
    business,
    getRawCustomFieldString(
      business?.siteContent?.customFields,
      "bamboo.global.map-lat",
    ),
    getRawCustomFieldString(
      business?.siteContent?.customFields,
      "bamboo.global.map-lng",
    ),
  );
  const hasCoords = coords !== null;
  // A blank (but present) address string must still fall through to coords —
  // `||`, not `??`, is deliberate here (same reasoning as heroBgImage above).
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const mapDest = location || coords || { latitude: 0, longitude: 0 };
  const { viewUrl, directionsUrl } = googleMapsUrls(mapDest);
  const lat = coords?.latitude ?? 0;
  const lng = coords?.longitude ?? 0;

  const contactInfo: {
    icon: typeof Mail;
    label: string;
    value?: string;
    href?: string;
    lines?: { label: string; value: string }[];
  }[] = [
    ...(email
      ? [{ icon: Mail, label: "Email", value: email, href: `mailto:${email}` }]
      : []),
    ...(location
      ? [{ icon: MapPin, label: "Location", value: location, href: undefined }]
      : []),
    ...(phone
      ? [{ icon: Phone, label: "Phone", value: phone, href: `tel:${phone}` }]
      : []),
    ...(hoursRows.length > 0
      ? [{ icon: Clock, label: "Hours", lines: hoursRows }]
      : legacyHours
        ? [{ icon: Clock, label: "Hours", value: legacyHours, href: undefined }]
        : []),
  ];

  return (
    <PageTransition>
      <BambooPageHero
        sectionAttrs={sectionGroupAttr("contact", "info")}
        title={f["bamboo.contact.header"]}
        titleFieldKey="bamboo.contact.header"
        lede={f["bamboo.contact.subheader"]}
        ledeFieldKey="bamboo.contact.subheader"
        image={f["bamboo.contact.hero-image"]}
        imagePriority
        bgImage={heroBgImage}
      />

      <section className="mx-auto max-w-7xl px-4 py-20 md:py-28 lg:px-8">
        <FadeIn direction="up">
          <div className="flex w-full flex-col gap-12 lg:flex-row">
            {/* Form */}
            <BambooContactForm
              successHeading={f["bamboo.contact.form-success-heading"] ?? ""}
              successBody={f["bamboo.contact.form-success-body"] ?? ""}
            />

            {/* Contact Info Sidebar. The sr-only h2 keeps the outline
                h1 → h2 → h3 (hb itself skips to h3 here — a bug we don't copy). */}
            <div className="w-full shrink-0 lg:w-80">
              <h2 className="sr-only">Contact details</h2>
              <div className="rounded-2xl border border-[var(--bam-hairline)] bg-[var(--bam-cream-deep)] p-6 lg:sticky lg:top-24">
                <div className="flex flex-col divide-y divide-[var(--bam-gold)]/20">
                  {contactInfo.map((info) => (
                    <div
                      key={info.label}
                      className="flex items-start gap-4 py-5 first:pt-0 last:pb-0"
                    >
                      <div className={iconCircleClass} aria-hidden="true">
                        <info.icon className="size-5 text-[var(--bam-forest)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-foreground text-sm font-semibold">
                          {info.label}
                        </h3>
                        {info.lines ? (
                          <dl className="mt-1 space-y-0.5">
                            {info.lines.map((line, i) => (
                              <div
                                key={line.label + String(i)}
                                className="flex items-baseline justify-between gap-3 text-sm"
                              >
                                <dt className="text-muted-foreground">
                                  {line.label}
                                </dt>
                                <dd className="text-muted-foreground">
                                  {line.value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : info.href ? (
                          <a
                            href={info.href}
                            className="text-muted-foreground text-sm transition-colors hover:text-[var(--bam-forest)]"
                          >
                            {info.value}
                          </a>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {info.value}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {hasCoords &&
        isSectionVisible(
          business?.siteContent?.customFields,
          "bamboo",
          "contact.map",
        ) && (
          <section
            {...sectionGroupAttr("contact", "map")}
            className="bg-[var(--bam-cream-deep)] py-20 md:py-28"
          >
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
              <FadeIn direction="up">
                <div className="mb-12 text-center">
                  {f["bamboo.contact.map-eyebrow"] ? (
                    <span
                      className={eyebrowClass + " text-center"}
                      {...fieldAttr("bamboo.contact.map-eyebrow")}
                    >
                      {f["bamboo.contact.map-eyebrow"]}
                    </span>
                  ) : null}
                  <h2 className="text-foreground font-serif text-4xl font-bold tracking-tight md:text-5xl">
                    <span
                      className="text-balance"
                      {...fieldAttr("bamboo.contact.map-heading")}
                    >
                      {f["bamboo.contact.map-heading"]}
                    </span>
                  </h2>
                </div>
              </FadeIn>
              <FadeIn direction="up" delay={0.1}>
                <BambooMap
                  businessName={business?.name ?? ""}
                  address={location}
                  latitude={lat}
                  longitude={lng}
                  viewUrl={viewUrl}
                  directionsUrl={directionsUrl}
                />
              </FadeIn>
            </div>
          </section>
        )}

      {faq.length > 0 &&
        isSectionVisible(customFields, "bamboo", "contact.faq") && (
          <section
            {...sectionGroupAttr("contact", "faq")}
            className="mx-auto max-w-7xl px-4 py-20 md:py-28 lg:px-8"
          >
            <FadeIn direction="up">
              <div className="mb-12 text-center">
                {f["bamboo.contact.faq-eyebrow"] ? (
                  <span
                    className={eyebrowClass + " text-center"}
                    {...fieldAttr("bamboo.contact.faq-eyebrow")}
                  >
                    {f["bamboo.contact.faq-eyebrow"]}
                  </span>
                ) : null}
                <h2 className="text-foreground font-serif text-4xl font-bold tracking-tight md:text-5xl">
                  <span
                    className="text-balance"
                    {...fieldAttr("bamboo.contact.faq-heading")}
                  >
                    {f["bamboo.contact.faq-heading"]}
                  </span>
                </h2>
                {f["bamboo.contact.faq-lede"] ? (
                  <p
                    className="text-muted-foreground mx-auto mt-4 max-w-2xl"
                    {...fieldAttr("bamboo.contact.faq-lede")}
                  >
                    {f["bamboo.contact.faq-lede"]}
                  </p>
                ) : null}
              </div>
            </FadeIn>
            <FadeIn direction="up" delay={0.1}>
              <BambooAccordion className="mx-auto max-w-3xl">
                {faq.map((row) => (
                  <BambooAccordionItem
                    key={row.id}
                    id={row.id}
                    title={row.question}
                  >
                    {row.answer}
                  </BambooAccordionItem>
                ))}
              </BambooAccordion>
            </FadeIn>
          </section>
        )}
    </PageTransition>
  );
}
