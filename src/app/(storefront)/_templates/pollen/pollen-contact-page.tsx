import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../types";

import { PollenContactForm } from "./pollen-contact-form";
import { PollenGeneralLayout } from "./pollen-general-layout";

const DEFAULT_FORM_IMAGE =
  "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=800&h=1000&fit=crop";

export function PollenContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const themeSpecificFields = business?.siteContent?.customFields as Record<
    string,
    string
  >;

  const formImage =
    themeSpecificFields["pollen.contact.form-image"] ?? DEFAULT_FORM_IMAGE;
  const formTitle =
    themeSpecificFields["pollen.contact.form-title"] ?? "Send us a message";
  const formDescription =
    themeSpecificFields["pollen.contact.form-description"] ??
    "We'd love to hear from you!";

  const physicalAddress =
    themeSpecificFields["pollen.contact.address"] ??
    business?.businessAddress ??
    "Detroit, MI";
  const contactEmail = business?.supportEmail ?? "hello@example.com";
  const phoneNumber =
    themeSpecificFields["pollen.contact.phone"] ?? "(123) 456-7890";

  return (
    <PollenGeneralLayout
      business={business}
      title="Contact Us"
      subtitle="Let's Talk"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 pb-20 sm:px-6 md:py-20 lg:px-8">
        {/* Contact info cards */}
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="group rounded-lg bg-[#E5E8E0] px-6 py-8 text-left transition-colors duration-200 hover:bg-[#5B8A3F]">
            <div className="mb-4 flex justify-center">
              <MapPin
                className="h-8 w-8 text-[#5B8A3F] transition-colors duration-200 group-hover:text-white"
                aria-hidden
              />
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#5B8A3F] transition-colors duration-200 group-hover:text-white">
              Physical Address
            </h3>
            <p className="text-sm font-normal text-[#5B8A3F] transition-colors duration-200 group-hover:text-white">
              {physicalAddress}
            </p>
          </div>

          <div className="group rounded-lg bg-[#E5E8E0] px-6 py-8 text-left transition-colors duration-200 hover:bg-[#5B8A3F]">
            <div className="mb-4 flex justify-center">
              <Mail
                className="h-8 w-8 text-[#5B8A3F] transition-colors duration-200 group-hover:text-white"
                aria-hidden
              />
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#5B8A3F] transition-colors duration-200 group-hover:text-white">
              Email Address
            </h3>
            <Link
              href={`mailto:${contactEmail}`}
              className="text-sm font-normal text-[#5B8A3F] underline transition-colors duration-200 group-hover:text-white"
            >
              {contactEmail}
            </Link>
          </div>

          <div className="group rounded-lg bg-[#E5E8E0] px-6 py-8 text-left transition-colors duration-200 hover:bg-[#5B8A3F]">
            <div className="mb-4 flex justify-center">
              <Phone
                className="h-8 w-8 text-[#5B8A3F] transition-colors duration-200 group-hover:text-white"
                aria-hidden
              />
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#5B8A3F] transition-colors duration-200 group-hover:text-white">
              Phone Number
            </h3>
            <p className="text-sm font-normal text-[#5B8A3F] transition-colors duration-200 group-hover:text-white">
              {phoneNumber}
            </p>
          </div>
        </div>

        {/* Two-column layout: left = dark green + plant, right = light gray + form */}
        <div className="grid min-h-[560px] grid-cols-1 overflow-hidden rounded-lg shadow-xl lg:grid-cols-3">
          {/* Left column: dark forest green with plant image */}
          <div className="relative flex flex-col items-center justify-end bg-[#2D4E2A] px-8 pt-8 lg:col-span-1 lg:justify-center lg:px-12">
            <div className="relative h-full w-full">
              <Image
                src={formImage}
                alt=""
                fill
                className="object-cover object-bottom"
                sizes="100vw"
                priority
              />
            </div>
          </div>

          {/* Right column: light gray with form */}
          <div className="flex flex-col bg-[#f5f5f5] p-8 lg:col-span-2 lg:justify-center lg:p-12">
            <PollenContactForm
              businessName={business.name}
              formTitle={formTitle}
              formDescription={formDescription}
            />
          </div>
        </div>
      </div>
    </PollenGeneralLayout>
  );
}
