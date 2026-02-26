"use client";

import { Clock, Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../types";

import { BambooContactForm } from "./bamboo-contact-form";

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@finallyresults.com",
    href: "mailto:hello@finallyresults.com",
  },
  {
    icon: MapPin,
    label: "Location",
    value: "Detroit, Michigan",
    href: undefined,
  },
  {
    icon: Phone,
    label: "Phone",
    value: "(313) 555-0199",
    href: "tel:+13135550199",
  },
  {
    icon: Clock,
    label: "Business Hours",
    value: "Mon - Fri, 9am - 5pm EST",
    href: undefined,
  },
];

export function BambooContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
      <div className="mb-12">
        <h1 className="text-foreground font-serif text-3xl font-bold tracking-tight md:text-4xl">
          Get in Touch
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Have a question, want to partner with us, or just want to say hello?
          We would love to hear from you.
        </p>
      </div>

      <div className="flex flex-col gap-12 lg:flex-row">
        {/* Form */}
        <BambooContactForm businessName={business.name} />

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
    </section>
  );
}
