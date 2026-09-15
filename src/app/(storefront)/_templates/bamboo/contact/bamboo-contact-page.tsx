"use client";

import { Clock, Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import type { TemplateListRow } from "~/lib/template-fields";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
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

// Built-in example FAQ, used when the owner hasn't configured any rows.
const DEFAULT_FAQ: TemplateListRow[] = [
  {
    _id: "default-faq-1",
    question: "What makes bamboo tissue different from regular paper products?",
    answer:
      "Bamboo fiber is naturally soft and strong without the heavy chemical processing traditional paper relies on, so you get a premium feel with a lighter footprint.",
  },
  {
    _id: "default-faq-2",
    question: "Is bamboo tissue septic-safe and biodegradable?",
    answer:
      "Yes -- our bamboo paper products break down readily and are safe for septic systems, unlike many tree-based alternatives.",
  },
  {
    _id: "default-faq-3",
    question: "Do you ship outside Michigan?",
    answer:
      "We ship nationwide from our home base in Detroit, with tracking on every order.",
  },
  {
    _id: "default-faq-4",
    question: "Do you offer subscriptions or bulk and wholesale pricing?",
    answer:
      "Yes -- reach out to our team and we'll set you up with recurring delivery or a bulk and wholesale arrangement that fits your needs.",
  },
  {
    _id: "default-faq-5",
    question: "What if I'm not happy with my order?",
    answer:
      "Your satisfaction matters to us -- reach out and we'll make it right.",
  },
];

function readString(row: TemplateListRow, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

export function BambooContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "bamboo.contact.header",
    "bamboo.contact.subheader",
    "bamboo.contact.hero-image",
    "bamboo.contact.hours",
    "bamboo.contact.map-heading",
    "bamboo.global.map-lat",
    "bamboo.global.map-lng",
    "bamboo.contact.faq-heading",
    "bamboo.contact.faq-lede",
  ]);

  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const faqRows = parseTemplateListRows(customFields?.["bamboo.contact.faq"]);
  const faq = faqRows.length > 0 ? faqRows : DEFAULT_FAQ;

  const email = business?.supportEmail?.trim();
  const location = business?.businessAddress?.trim();
  const phone = business?.phoneNumber?.trim();
  const hours = f["bamboo.contact.hours"]?.trim();

  const latRaw = f["bamboo.global.map-lat"]?.trim();
  const lngRaw = f["bamboo.global.map-lng"]?.trim();
  const lat = latRaw ? Number(latRaw) : NaN;
  const lng = lngRaw ? Number(lngRaw) : NaN;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const mapDest = location ? encodeURIComponent(location) : `${lat},${lng}`;
  const viewUrl = `https://www.google.com/maps/search/?api=1&query=${mapDest}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapDest}`;

  const contactInfo: {
    icon: typeof Mail;
    label: string;
    value: string;
    href?: string;
    field?: string;
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
    ...(hours
      ? [
          {
            icon: Clock,
            label: "Hours",
            value: hours,
            href: undefined,
            field: "bamboo.contact.hours",
          },
        ]
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
      />

      <section className="mx-auto max-w-7xl px-4 py-20 md:py-28 lg:px-8">
        <FadeIn direction="up">
          <div className="flex w-full flex-col gap-12 lg:flex-row">
            {/* Form */}
            <BambooContactForm />

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
                      <div>
                        <h3 className="text-foreground text-sm font-semibold">
                          {info.label}
                        </h3>
                        {info.href ? (
                          <a
                            href={info.href}
                            className="text-muted-foreground text-sm transition-colors hover:text-[var(--bam-forest)]"
                            {...(info.field ? fieldAttr(info.field) : {})}
                          >
                            {info.value}
                          </a>
                        ) : (
                          <p
                            className="text-muted-foreground text-sm"
                            {...(info.field ? fieldAttr(info.field) : {})}
                          >
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
                  <span className={eyebrowClass + " text-center"}>Find Us</span>
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

      {isSectionVisible(
        business?.siteContent?.customFields,
        "bamboo",
        "contact.faq",
      ) && (
        <section
          {...sectionGroupAttr("contact", "faq")}
          className="mx-auto max-w-7xl px-4 py-20 md:py-28 lg:px-8"
        >
          <FadeIn direction="up">
            <div className="mb-12 text-center">
              <span className={eyebrowClass + " text-center"}>Answers</span>
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
              {faq.map((row, i) => (
                <BambooAccordionItem
                  key={row._id ?? `faq-${i}`}
                  id={row._id ?? `faq-${i}`}
                  title={readString(row, "question")}
                >
                  {readString(row, "answer")}
                </BambooAccordionItem>
              ))}
            </BambooAccordion>
          </FadeIn>
        </section>
      )}
    </PageTransition>
  );
}
