import { Mail, MapPin } from "lucide-react";

import type { DefaultContactPageTemplateProps } from "../types";

import { PollenContactForm } from "./pollen-contact-form";
import { PollenGeneralLayout } from "./pollen-general-layout";

export function PollenContactPage({
  business,
}: DefaultContactPageTemplateProps) {
  const physicalAddress = "Detroit, MI";
  const contactEmail = business?.supportEmail ?? "";

  const themeSpecificFields = business?.siteContent?.customFields as Record<
    string,
    string
  >;

  return (
    <PollenGeneralLayout
      business={business}
      title="Contact Us"
      subtitle="Let's Talk"
    >
      <div className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Physical Address */}
        <div className="flex flex-col items-center rounded-sm bg-[#2a351f] p-12 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20">
            <MapPin className="h-8 w-8 text-white" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-white">
            Physical Address
          </h3>
          <p className="text-white/70">{physicalAddress}</p>
        </div>

        {/* Email Address */}
        <div className="flex flex-col items-center rounded-sm bg-[#2a351f] p-12 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-white">
            Email Address
          </h3>
          <p className="text-white/70">{contactEmail}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <span className="text-sm font-semibold tracking-wider text-[#A8D081] uppercase">
            {themeSpecificFields["pollen.contact.subheader"] ??
              "Contact Us Subheader"}
          </span>
          <h2 className="mt-2 text-3xl font-bold text-white md:text-5xl">
            {themeSpecificFields["pollen.contact.header"] ?? "Contact Us"}
          </h2>
          <p className="mt-4 text-white/70">
            {themeSpecificFields["pollen.contact.description"] ??
              "Contact Us Description"}
          </p>
        </div>

        <PollenContactForm businessName={business.name} />
      </div>
    </PollenGeneralLayout>
  );
}
