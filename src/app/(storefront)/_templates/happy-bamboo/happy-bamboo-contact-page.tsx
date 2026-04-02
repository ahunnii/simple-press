/* eslint-disable @next/next/no-img-element */
"use client";

import { Clock, Mail, MapPin, MessageSquare, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../types";
import { getListFieldValue } from "~/lib/template-fields";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";

import { BambooContactForm } from "./bamboo-contact-form";
import { FadeIn, PageTransition } from "./happy-bamboo-animations";
import { parseHappyBambooFrequentlyAskedList } from "./happy-bamboo-frequently-asked-data";

const DEFAULT_EMAIL = "hello@finallyresults.com";
const DEFAULT_LOCATION = "Detroit, Michigan";
const DEFAULT_PHONE = "(313) 555-0199";
const DEFAULT_HOURS = "Mon - Fri, 9am - 5pm EST";

export function HappyBambooContactPage({
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

  const servicesListRaw = getListFieldValue(
    themeSpecificFields as unknown,
    "happy-bamboo.contact-frequently-asked-questions",
  );
  const frequentlyAsked = parseHappyBambooFrequentlyAskedList(servicesListRaw);

  const contactInfo = [
    { icon: Mail, label: "Email", value: email, href: `mailto:${email}` },
    { icon: MapPin, label: "Location", value: locationValue, href: undefined },
    {
      icon: Phone,
      label: "Phone",
      value: phone,
      href: `tel:${phone.replace(/\D/g, "")}`,
    },
    // { icon: Clock, label: "Business Hours", value: hours, href: undefined },
  ];

  const contactImage =
    themeSpecificFields?.["happy-bamboo.contact-image"]?.trim();

  return (
    <PageTransition>
      <section className="bg-muted/50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex w-full flex-row items-center justify-center gap-12">
            {/* Text content */}
            <FadeIn className="flex flex-1 flex-col justify-center text-left">
              <Badge className="mb-4 w-fit">
                <MessageSquare className="mr-1 h-3 w-3" />
                Get in Touch
              </Badge>
              <h1 className="font-heading mb-4 text-4xl font-bold md:text-5xl">
                Contact Us
              </h1>
              <p className="text-muted-foreground text-lg">
                Have questions about our products? Maybe about your order? Let
                us know! We will get back to you within 24 hours.
              </p>
            </FadeIn>
            {/* Aspect-video image on the right */}
            <FadeIn
              direction="right"
              className="flex flex-1 items-center justify-center"
            >
              <div className="aspect-video w-full max-w-md overflow-hidden rounded-xl border border-white/20 bg-white/20 shadow-md">
                <img
                  src={contactImage ?? "/placeholder.svg"}
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

      {/* FAQ Section */}
      <section className="bg-muted/50 py-12 md:py-20">
        <div className="container mx-auto px-4">
          <FadeIn className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground">
              Find answers to common questions about our products and services.
            </p>
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
