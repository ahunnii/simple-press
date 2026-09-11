"use client";

import { Clock, Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { BambooMap } from "../shared/bamboo-map";
import { BambooPageHero } from "../shared/bamboo-page-hero";
import { BambooContactForm } from "./bamboo-contact-form";

// Eyebrow-over-serif-h2 rhythm (docs/templates/bamboo/design.md "Section
// rhythm"). These labels are decorative -- not bound to any field.
const eyebrowClass =
  "mb-3 block text-xs font-semibold tracking-widest text-[var(--bam-gold)] uppercase";
const iconCircleClass =
  "flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--bam-gold)]/40";

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
  ]);

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
    </PageTransition>
  );
}
