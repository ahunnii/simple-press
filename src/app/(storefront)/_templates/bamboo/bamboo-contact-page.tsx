"use client";

import { Clock, Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../types";

import { FadeIn, PageTransition } from "./bamboo-animations";
import { BambooContactForm } from "./bamboo-contact-form";

const DEFAULT_EMAIL = "hello@finallyresults.com";
const DEFAULT_LOCATION = "Detroit, Michigan";
const DEFAULT_PHONE = "(313) 555-0199";
const DEFAULT_HOURS = "Mon - Fri, 9am - 5pm EST";

export function BambooContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const themeSpecificFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const header =
    themeSpecificFields?.["bamboo.contact.header"] ?? "Get in Touch";
  const subheader =
    themeSpecificFields?.["bamboo.contact.subheader"] ??
    "Have a question, want to partner with us, or just want to say hello? We would love to hear from you.";
  const email = themeSpecificFields?.["bamboo.contact.email"] ?? DEFAULT_EMAIL;
  const locationValue =
    themeSpecificFields?.["bamboo.contact.location"] ?? DEFAULT_LOCATION;
  const phone = themeSpecificFields?.["bamboo.contact.phone"] ?? DEFAULT_PHONE;
  const hours = themeSpecificFields?.["bamboo.contact.hours"] ?? DEFAULT_HOURS;

  const contactInfo = [
    { icon: Mail, label: "Email", value: email, href: `mailto:${email}` },
    { icon: MapPin, label: "Location", value: locationValue, href: undefined },
    // {
    //   icon: Phone,
    //   label: "Phone",
    //   value: phone,
    //   href: `tel:${phone.replace(/\D/g, "")}`,
    // },
    // { icon: Clock, label: "Business Hours", value: hours, href: undefined },
  ];

  return (
    <PageTransition>
      <section className="bg-secondary">
        <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-8 px-4 py-16 md:flex-row md:py-24 lg:px-8">
          <FadeIn
            direction="right"
            className="flex flex-1 flex-col items-start gap-6"
          >
            <h1 className="text-foreground font-heading text-4xl leading-tight font-bold tracking-tight md:text-5xl">
              <span className="text-balance">{header}</span>
            </h1>
            <p className="text-muted-foreground max-w-lg text-lg leading-relaxed">
              {subheader}
            </p>
          </FadeIn>
          {/* <FadeIn direction="left" delay={0.15} className="relative flex-1">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
            <Image
              src="/images/septic-safe.jpg"
              alt="Illustration showing bamboo toilet paper dissolving safely in a septic system"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </FadeIn> */}
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
                    <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
                      <info.icon className="text-primary size-5" />
                    </div>
                    <div>
                      <h3 className="text-foreground text-sm font-semibold">
                        {info.label}
                      </h3>
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
    </PageTransition>
  );
}
