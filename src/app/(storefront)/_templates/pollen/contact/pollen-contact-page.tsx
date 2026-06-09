import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "..";
import { PollenGeneralLayout } from "../layout/pollen-general-layout";
import { PollenContactForm } from "./pollen-contact-form";
import { PollenContactInfoCard } from "./pollen-contact-info-card";

export function PollenContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "pollen.contact.page-title",
    "pollen.contact.page-subtitle",
    "pollen.contact.form-title",
    "pollen.contact.form-description",
    "pollen.contact.form-image",
  ]);

  const formTitle = f["pollen.contact.form-title"];
  const formDescription = f["pollen.contact.form-description"];

  const physicalAddress = business?.businessAddress ?? "Detroit, MI";
  const contactEmail = business?.supportEmail ?? "hello@example.com";
  const phoneNumber = business?.phoneNumber ?? "(123) 456-7890";

  const contactInfo = [
    {
      icon: MapPin,
      label: "Location",
      value: physicalAddress,
      href: undefined,
    },
    {
      icon: Mail,
      label: "Email Address",
      value: contactEmail,
      href: `mailto:${contactEmail}`,
    },
    {
      icon: Phone,
      label: "Phone Number",
      value: phoneNumber,
      href: `tel:${phoneNumber}`,
    },
  ];

  return (
    <PollenGeneralLayout
      business={business}
      title={f["pollen.contact.page-title"] ?? "Contact Us"}
      subtitle={f["pollen.contact.page-subtitle"] ?? "Let's Talk"}
      sectionAttrs={sectionGroupAttr("contact", "main")}
    >
      <div
        className="mx-auto max-w-7xl px-4 py-20 pb-20 sm:px-6 md:py-20 lg:px-8"
        {...sectionGroupAttr("contact", "main")}
      >
        <StaggerContainer className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {contactInfo.map((info) => (
            <StaggerItem key={info.label}>
              <PollenContactInfoCard
                Icon={info.icon}
                label={info.label}
                value={info.value}
                href={info.href}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeIn direction="up" delay={0.15}>
          <div className="grid min-h-[560px] grid-cols-1 overflow-hidden rounded-lg shadow-xl lg:grid-cols-3">
            <div className="relative flex flex-col items-center justify-end bg-[#2D4E2A] lg:col-span-1 lg:justify-center">
              <div className="relative h-full w-full">
                <Image
                  src={f["pollen.contact.form-image"]!}
                  alt=""
                  fill
                  className="object-cover object-bottom"
                  sizes="100vw"
                  priority
                />
              </div>
            </div>

            <div className="flex flex-col bg-[#f5f5f5] p-8 lg:col-span-2 lg:justify-center lg:p-12">
              <PollenContactForm
                businessName={business.name}
                formTitle={formTitle}
                formDescription={formDescription}
              />
            </div>
          </div>
        </FadeIn>
      </div>
    </PollenGeneralLayout>
  );
}
