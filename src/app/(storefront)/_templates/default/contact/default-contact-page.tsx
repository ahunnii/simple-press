import { Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { DefaultContactForm } from "./default-contact-form";

export function DefaultContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "default.contact.heading",
    "default.contact.description",
  ]);

  const businessPhone = business?.phoneNumber;
  const businessEmail = business?.supportEmail;
  const businessAddress = business?.businessAddress;

  const contactInfo = [
    ...(businessPhone
      ? [
          {
            icon: Phone,
            label: "Phone",
            value: businessPhone,
            href: `tel:${businessPhone}`,
          },
        ]
      : []),
    ...(businessEmail
      ? [
          {
            icon: Mail,
            label: "Email",
            value: businessEmail,
            href: `mailto:${businessEmail}`,
          },
        ]
      : []),
    ...(businessAddress
      ? [
          {
            icon: MapPin,
            label: "Address",
            value: businessAddress,
            href: undefined,
          },
        ]
      : []),
  ];

  return (
    <PageTransition className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <section className="pt-20 text-center">
        <FadeIn className="mx-auto w-full max-w-4xl space-y-4">
          <h1
            className="text-left text-xl leading-none tracking-tight"
            style={{
              fontSize: "clamp(2.1rem, 5.25vw, 3.75rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {f["default.contact.heading"]}
          </h1>

          <p className="mb-8 text-left text-gray-600">
            {f["default.contact.description"]}
          </p>
        </FadeIn>
      </section>

      <section className="py-2">
        <FadeIn className="mx-auto w-full max-w-4xl">
          <div className="grid grid-cols-1 gap-6 py-8 md:grid-cols-3">
            {contactInfo.map((info, index) => (
              <div key={index} className="flex items-center gap-2 border p-3">
                <info.icon className="text-primary mr-2 size-5" />
                <span className="font-medium">{info.label}:</span>
                {info.href ? (
                  <a
                    href={info.href}
                    className="ml-1 text-sm text-blue-600 hover:underline"
                  >
                    {info.value}
                  </a>
                ) : (
                  <span className="ml-1 text-sm text-gray-700">
                    {info.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      <section className="pt-8 pb-20">
        <FadeIn className="mx-auto w-full max-w-4xl">
          <DefaultContactForm />
        </FadeIn>
      </section>
    </PageTransition>
  );
}
