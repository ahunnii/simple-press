/* eslint-disable @next/next/no-img-element */
"use client";

import { Mail, MapPin, MessageSquare, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { getListFieldValue } from "~/lib/template-fields";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { HappyBambooContactForm } from "./happy-bamboo-contact-form";
import { parseHappyBambooFrequentlyAskedList } from "./happy-bamboo-frequently-asked-data";

export function HappyBambooContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "happy-bamboo.contact.header",
    "happy-bamboo.contact.subheader",
    "happy-bamboo.contact-image",
    "happy-bamboo.contact-faq-title",
    "happy-bamboo.contact-faq-subtitle",
  ]);

  const supportEmail = business?.supportEmail;
  const phone = business?.phoneNumber;
  const locationValue = business?.businessAddress;

  const servicesListRaw = getListFieldValue(
    business?.siteContent?.customFields,
    "happy-bamboo.contact-frequently-asked-questions",
  );
  const frequentlyAsked = parseHappyBambooFrequentlyAskedList(servicesListRaw);

  const contactInfo = [
    ...(supportEmail
      ? [
          {
            icon: Mail,
            label: "Email",
            value: supportEmail,
            href: `mailto:${supportEmail}`,
          },
        ]
      : []),
    ...(locationValue
      ? [
          {
            icon: MapPin,
            label: "Location",
            value: locationValue,
            href: undefined,
          },
        ]
      : []),
    ...(phone
      ? [
          {
            icon: Phone,
            label: "Phone",
            value: phone,
            href: `tel:${phone.replace(/\D/g, "")}`,
          },
        ]
      : []),
  ];

  return (
    <PageTransition>
      <section
        className="bg-muted/50 py-16 md:py-24"
        {...sectionGroupAttr("contact", "info")}
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto flex w-full flex-col items-center justify-center gap-12 md:flex-row">
            {/* Text content */}
            <FadeIn className="flex flex-1 flex-col justify-center text-left">
              <Badge className="mb-4 w-fit">
                <MessageSquare className="mr-1 h-3 w-3" />
                Get in Touch
              </Badge>
              <h1
                className="mb-4 font-serif text-4xl font-bold md:text-5xl"
                {...fieldAttr("happy-bamboo.contact.header")}
              >
                {f["happy-bamboo.contact.header"]}
              </h1>
              <p
                className="text-muted-foreground text-lg"
                {...fieldAttr("happy-bamboo.contact.subheader")}
              >
                {f["happy-bamboo.contact.subheader"]}
              </p>
            </FadeIn>
            {/* Aspect-video image on the right */}
            <FadeIn
              direction="right"
              className="flex flex-1 items-center justify-center"
            >
              <div className="aspect-video w-full max-w-md overflow-hidden rounded-xl border border-white/20 bg-white/20 shadow-md">
                <img
                  src={f["happy-bamboo.contact-image"]}
                  alt="Bamboo contact illustration"
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <FadeIn direction="up">
          <div className="mx-auto flex w-full flex-col gap-12 lg:flex-row">
            {/* Form */}
            <HappyBambooContactForm />

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

      {/* FAQ Section */}
      <section
        className="bg-muted/50 py-12 md:py-20"
        {...sectionGroupAttr("contact", "faq")}
      >
        <div className="container mx-auto px-4">
          <FadeIn className="mb-12 text-center">
            <h2
              className="mb-4 font-serif text-3xl font-bold md:text-4xl"
              {...fieldAttr("happy-bamboo.contact-faq-title")}
            >
              {f["happy-bamboo.contact-faq-title"]}
            </h2>
            {f["happy-bamboo.contact-faq-subtitle"] && (
              <p
                className="text-muted-foreground"
                {...fieldAttr("happy-bamboo.contact-faq-subtitle")}
              >
                {f["happy-bamboo.contact-faq-subtitle"]}
              </p>
            )}
          </FadeIn>

          <FadeIn delay={0.1} className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              {frequentlyAsked?.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeIn>
        </div>
      </section>
    </PageTransition>
  );
}
