"use client";

import { Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { BambooMap } from "../shared/bamboo-map";
import { BambooContactForm } from "./bamboo-contact-form";

export function BambooContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "bamboo.contact.header",
    "bamboo.contact.subheader",
    "bamboo.contact.hours",
    "bamboo.contact.map-heading",
    "bamboo.global.map-lat",
    "bamboo.global.map-lng",
  ]);

  const email = business?.supportEmail?.trim();
  const location = business?.businessAddress?.trim();
  const phone = business?.phoneNumber?.trim();

  const latRaw = f["bamboo.global.map-lat"]?.trim();
  const lngRaw = f["bamboo.global.map-lng"]?.trim();
  const lat = latRaw ? Number(latRaw) : NaN;
  const lng = lngRaw ? Number(lngRaw) : NaN;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const mapDest = location ? encodeURIComponent(location) : `${lat},${lng}`;
  const viewUrl = `https://www.google.com/maps/search/?api=1&query=${mapDest}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapDest}`;

  const contactInfo = [
    ...(email
      ? [{ icon: Mail, label: "Email", value: email, href: `mailto:${email}` }]
      : []),
    ...(location
      ? [{ icon: MapPin, label: "Location", value: location, href: undefined }]
      : []),
    ...(phone
      ? [{ icon: Phone, label: "Phone", value: phone, href: `tel:${phone}` }]
      : []),
  ];

  return (
    <PageTransition>
      <section
        {...sectionGroupAttr("contact", "info")}
        className="bg-secondary"
      >
        <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-8 px-4 py-16 md:flex-row md:py-24 lg:px-8">
          <FadeIn
            direction="right"
            className="flex flex-1 flex-col items-start gap-6"
          >
            <h1 className="text-foreground font-heading text-4xl leading-tight font-bold tracking-tight md:text-5xl">
              <span
                className="text-balance"
                {...fieldAttr("bamboo.contact.header")}
              >
                {f["bamboo.contact.header"]}
              </span>
            </h1>
            <p
              className="text-muted-foreground max-w-lg text-lg leading-relaxed"
              {...fieldAttr("bamboo.contact.subheader")}
            >
              {f["bamboo.contact.subheader"]}
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <FadeIn direction="up">
          <div className="flex w-full flex-col gap-12 lg:flex-row">
            {/* Form */}
            <BambooContactForm />

            {/* Contact Info Sidebar */}
            <div className="w-full shrink-0 lg:w-80">
              <div className="flex flex-col gap-6">
                {contactInfo.map((info) => (
                  <div key={info.label} className="flex items-start gap-4">
                    <div
                      className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full"
                      aria-hidden="true"
                    >
                      <info.icon className="text-primary size-5" />
                    </div>
                    <div>
                      <h2 className="text-foreground text-sm font-semibold">
                        {info.label}
                      </h2>
                      {info.href ? (
                        <a
                          href={info.href}
                          className="text-muted-foreground hover:text-primary text-sm transition-colors"
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
            className="bg-secondary/50 py-20"
          >
            <div className="mx-auto max-w-7xl px-4 lg:px-8">
              <FadeIn direction="up">
                <div className="mb-12 text-center">
                  <h2 className="text-foreground font-heading text-3xl font-bold tracking-tight md:text-4xl">
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
